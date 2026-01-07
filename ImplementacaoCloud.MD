# Visão rápida (1 linha)

Coloque o Edge como buffer e pré-processador local; envie *blocos compactados, ordenados e autenticados* ao Cloud Broker → Stream layer → Storage (object + time-series) → serving API + dashboard.

---

# 1 — Arquitetura proposta (alto nível)

```
DAQ/PLC → LAN → Edge Gateway (local) 
           ├─ Local buffer (durável)
           ├─ Preprocess/compress (batching, downsample, validation)
           └─ Secure channel → Cloud Ingress (MQTT Broker / HTTPS / gRPC)
Cloud Ingress → Stream Processor (Kafka / PubSub) → Storage
                                  ├─ Hot DB (TimescaleDB / PostgreSQL)  ← for fast queries, dashboards
                                  └─ Cold Object Storage (S3 / GCS / MinIO) ← raw compressed batches (parquet)
Serving layer → API (Flask/Gunicorn or FastAPI) + WebSocket broker → Frontend
Aux: Monitoring (Prometheus + Grafana), Logging (ELK/EFK), CI/CD
```

---

# 2 — Comportamento do Edge (o que o Edge faz)

1. **Recebe os dados da DAQ** (UDP/TCP/HTTP/serial/driver).
2. **Valida** (schema, range, checksum).
3. **Agrupa em batches** (ex.: 5–50 amostras / batch — configurável).
4. **Compacta** (LZ4 / zstd) e opcionalmente **serializa** (Protobuf / MsgPack) para reduzir overhead.
5. **Adiciona metadata** (device_id, seq_no, timestamp_local, experiment_id).
6. **Persiste localmente** (append-only file / SQLite / small LevelDB) para tolerância a falhas.
7. **Envia ao Cloud** via canal seguro (mTLS over MQTT TLS / HTTPS gRPC) com ACK lógico.
8. **Confirmação e garbage collection**: só remove local batch após ACK do cloud.
9. **Fallback**: se internet falhar, mantém buffer (politica circular ou persistente configurável).
10. **Heartbeat / Telemetria**: periodicamente envia health metrics (latency, buffer size, last seq).

---

# 3 — Protocolo de transporte recomendado

* **Primária:** **MQTT over TLS (MQTTS)** com QoS 1 (garante pelo menos 1 entrega) e sessões persistentes + topic por cliente (ex.: `edge/{site_id}/{device_id}/batches`).

  * Prós: leve, built-for IoT, retained messages, widely supported.
* **Alternativa / adicional:** **gRPC over TLS** para grandes batches e RPCs controlados (push/pull).
* **Fallback:** **HTTPS POST** com retries expondo endpoint `/api/ingest/batch`.

Use **mTLS** para autenticar Edge ↔ Cloud quando possível; alternativamente JWTs com short TTL + rotating keys.

---

# 4 — Formato de dados e compactação

* **Wire format:** Protobuf (schema), ou MessagePack — menor overhead que JSON.
* **Compression:** LZ4 (ultra fast) or zstd (melhor ratio) — compress batch payloads.
* **Batch envelope:** JSON minimal header with metadata + compressed payload (binary).

  * header: `{"site":"atlas","edge_id":"edge-01","seq":1234,"ts_first":..., "count": 20, "schema_ver": 1}`
  * payload: compressed(Protobuf([samples])).

---

# 5 — Ingestão na cloud (ingress layer)

* **MQTT Broker** (HiveMQ / EMQX / Mosquitto) or managed (AWS IoT Core).
* Broker passa mensagens para **streaming** (Kafka / Managed Kafka / PubSub).
* Streaming alimenta dois caminhos:

  * **Fast path:** descompressão → insert into TimescaleDB/Postgres for recent data & queries.
  * **Cold path:** store original compressed batch (object store S3) with metadata + index in DB (pointer).

**Por quê?** Hot DB otimizado para queries e dashboards; cold store guarda raw for compliance/analytics.

---

# 6 — Storage / banco recomendado

* **TimescaleDB (Postgres + timescale extension)** — ótimo para séries temporais, compression nativa, SQL friendly.

  * Use hypertables, retention policies, continuous aggregates para downsampled views.
* **Object storage (S3 / MinIO / GCS)** — armazene batches em Parquet/Avro para custo baixo e analytics.
* **Metadata DB (Postgres)** — experiments, config_read, device registry, batch index (pointers para S3).

---

# 7 — Serving Layer (API & dashboard)

* **API**: FastAPI or Flask + Gunicorn/Uvicorn.

  * Endpoints: `/api/measurements/query`, `/api/experiments/{id}`, `/api/alerts` (auth + RBAC).
* **Realtime to clients**: WebSocket/Socket.IO server (separado ou junto) que consome from Kafka (or Redis pubsub) and broadcasts to connected clients.
* **Edge → user latency**: typical <200ms (depends on internet). Real-time feel via batching small and fast.

---

# 8 — Security (must-have)

* **Authentication & Authorization**: OAuth2/JWT for users; mTLS or cert-based for edge. RBAC for endpoints.
* **Encryption**: TLS everywhere; data-at-rest encryption for S3 and DB.
* **Device identity**: register devices and edges in registry with unique IDs + rotate certs.
* **Audit logs**: all critical actions logged and stored (immutable).
* **Network**: VPC, private subnets, security groups, firewall.
* **Secrets management**: HashiCorp Vault or cloud KMS.
* **Backups**: automated DB snapshots + S3 versioning + lifecycle.

---

# 9 — Reliability & ordering guarantees

* Use **sequence numbers** in batches + per-device watermark. Cloud verifies ordering and detects gaps.
* For idempotency, store batch hash and reject duplicates.
* Use **ACK** flow: Cloud responds with `ack(seq)` → Edge garbage-collects.
* For extreme scale: consider **exactly-once semantics** with Kafka + idempotent producers.

---

# 10 — Scalability & multi-tenant strategy

* **Ingest scale**: Kafka partitions keyed by `site_id` or `device_id`.
* **Multi-tenant isolation**: schema per tenant or tenant_id column + row-level security in Postgres.
* **Billing metering**: track samples/ingest volume per tenant for billing.
* **Autoscaling**: containerize services (K8s/ ECS) and autoscale consumers based on lag/CPU.

---

# 11 — Monitoring & Observability

* **Edge telemetry** → Prometheus pushgateway or periodic metrics to cloud (heartbeat topic).
* **Cloud monitoring**: Prometheus + Grafana for infra, Loki for logs, alerts via Alertmanager.
* **SLOs**: ingestion latency, batch ack rate, buffer depth on Edge, data loss rate.
* **Tracing**: OpenTelemetry to trace path from Edge → Cloud → Dashboard for debugging.

---

# 12 — Cost controls & storage lifecycle

* **Hot storage**: TimescaleDB for last N months (configurable).
* **Cold storage**: move raw batches to S3 Glacier/Archive after X months.
* **Downsampling**: continuous aggregates to reduce granularity for long-term retention.
* **Estimate**: telemetry with 22 channels @2Hz for 3 sessions/day produced tiny volumes (earlier calc ~18MB/day). Even at 100x scale cost remains small. Use compression + batching to minimize egress.

---

# 13 — Deployment & CI/CD

* **Edge deployment**: provide Docker image + systemd unit or binary package; auto-update mechanism via signed update server.
* **Cloud infra**: Terraform for infra provisioning (VPC, IAM, PKI, Kafka, S3, RDS/Timescale).
* **Apps**: GitHub Actions / GitLab CI → build images → push to registry → K8s helm charts deploy.
* **Secrets**: managed via Vault/Cloud KMS; avoid storing creds in images.

---

# 14 — Incremental rollout plan (practical steps)

**Phase A — Proof of concept (2–4 weeks)**

* Pick one pilot site (ATLAS). Deploy Edge prototype (Docker).
* Implement MQTT TLS ingestion endpoint + simple Kafka consumer → TimescaleDB.
* Show live dashboard consuming from DB and WebSocket.
* Validate ack/garbage-collection flow.

**Phase B — Harden + scale (1–3 months)**

* Add compression (LZ4) + Protobuf.
* Add object storage backup for compressed batches.
* Implement device registry + cert provisioning.
* Monitoring + alerts.

**Phase C — Commercialization (3–6 months)**

* Multi-tenant support, retention policies, billing hooks.
* SLA processes, support playbooks, on-site installation docs.
* Edge auto-update, central fleet management.

---

# 15 — Quick implementation checklist (actionable)

* [ ] Define batch size and frequency defaults (e.g., 20 samples / 0.5–2s window).
* [ ] Implement Protobuf schema for samples.
* [ ] Integrate LZ4 compression on Edge and decompression in Cloud.
* [ ] Provision MQTT Broker (TLS + auth) and topic structure.
* [ ] Implement Cloud ACK endpoint and GC protocol.
* [ ] Setup TimescaleDB and test inserts & continuous aggregates.
* [ ] Save raw compressed batches into S3 with metadata.
* [ ] Create WebSocket broadcast from Kafka → UI.
* [ ] Add device registry + cert issuing (automated script).
* [ ] Configure monitoring + alerting (Prometheus/Grafana).
* [ ] Security review: mTLS, secrets, IAM, backups.
* [ ] Create runbook for edge network outage and recovery.

---

# 16 — Tech stack suggestions (short list)

* Edge: Python/Go/Rust daemon (Go/Rust for low-latency), Docker packaging.
* Wire: Protobuf + LZ4 or MsgPack + zstd.
* Ingest: MQTT (EMQX / HiveMQ) or AWS IoT Core.
* Stream: Kafka (Confluent / MSK) or managed Pub/Sub.
* Hot DB: TimescaleDB (Postgres)
* Cold: S3 (or MinIO on-prem) storing Parquet/Avro.
* API: FastAPI + Uvicorn / Gunicorn.
* Realtime broadcast: Redis Streams or Kafka consumer + Socket.IO.
* Infra: Kubernetes + Terraform.
* Observability: Prometheus + Grafana + Loki.

---

# 17 — Estimated priorities & effort (high level)

* **MVP ingestion (Edge → Cloud) w/ MQTT + TimescaleDB**: 2–4 weeks (1 dev)
* **Compression + batch ACK & S3 backup**: 1–2 weeks
* **Monitoring, Device registry, Security hardening**: 2–4 weeks
* **Multi-tenant & billing + commercial polish**: 4–8 weeks

---

# 18 — Considerações comerciais / SLAs

* Para vender Professional/Enterprise: garanta SLOs (ingest latency <1s–5s), RPO/RTO targets, and a clear support SLA.
* Tenha “edge onboarding” como serviço (setup fee) — instalam, certificam, comissionam.
* Ofereça opções: pay-per-device or site flat-fee (negociável).

---

# 19 — Exemplo minimal message flow (concrete)

Edge builds a batch:

```json
{
  "header": {"site":"atlas","edge":"edge-01","seq":1234,"count":20,"ts_first":169..."},
  "payload": "<LZ4 compressed protobuf binary>"
}
```

Edge POSTs to MQTT topic `edges/atlas/edge-01/batch` over TLS. Broker forwards to consumer group that:

1. Decompress payload
2. Deserialize protobuf → list of samples
3. Insert into TimescaleDB (COPY/bulk insert)
4. Store compressed batch into S3 with metadata `site,edge,seq,first_ts,last_ts`
5. Emit ack `{"edge":"edge-01","seq":1234,"status":"ok"}` to `edges/atlas/edge-01/acks` topic.

Edge receives ack → deletes local persisted batch.

---

# 20 — Últimas recomendações práticas

* **Comece simples**: MQTT + TimescaleDB + S3 + small UI. Prove confiança.
* **Mensure tudo**: bytes/day, batches/day, acks latency, buffer depth. Use essas métricas na conversa comercial (ROI).
* **Faça edge configurável**: parâmetros de batch, retention, compression, so you can tune per-customer.
* **Automatize update e provisioning** desde a primeira instalação — reduz custo de suporte.
