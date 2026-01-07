import matplotlib.pyplot as plt
import matplotlib.animation as animation
from collections import deque
import pyvisa as visa
import time
import pandas as pd
from datetime import datetime

INSTRUMENT_ADDRESS = 'USB0::0x0957::0x2007::MY57002869::0::INSTR'


CHANNEL_VOLT = '201'
CHANNEL_TEMP = '202'
CHANNEL_RES = '203'


UPDATE_INTERVAL_MS = 2000
TIME_WINDOW_SECONDS = 3600


instrument = None
active_plot = 'volt'

try:
    rm = visa.ResourceManager()
    instrument = rm.open_resource(INSTRUMENT_ADDRESS)
    instrument.timeout = 5000
    instrument.write('*RST; *CLS')
    identity = instrument.query('*IDN?')
    print(f"Conectado a: {identity.strip()}")

    instrument.write(f"CONF:VOLT:DC AUTO,DEF,(@{CHANNEL_VOLT})")
    instrument.write(f"CONF:TEMP TC,K,(@{CHANNEL_TEMP})")
    instrument.write(f"SENS:TEMP:TRAN:TC:RJUN:TYPE INT,(@{CHANNEL_TEMP})")
    instrument.write(f"CONF:RES AUTO,DEF,(@{CHANNEL_RES})")

    scan_list = f"(@{CHANNEL_VOLT},{CHANNEL_TEMP},{CHANNEL_RES})"
    instrument.write(f"ROUT:SCAN {scan_list}")
    instrument.write("TRIG:SOUR IMM")
    instrument.write(f"TRIG:COUN 1")

except visa.errors.VisaIOError as e:
    print(f"Erro ao conectar ou configurar o instrumento: {e}")
    instrument = None


max_points = int(TIME_WINDOW_SECONDS / (UPDATE_INTERVAL_MS / 1000.0)) + 2
data = {
    'volt': {'x': deque(maxlen=max_points), 'y': deque(maxlen=max_points)},
    'temp': {'x': deque(maxlen=max_points), 'y': deque(maxlen=max_points)},
    'res':  {'x': deque(maxlen=max_points), 'y': deque(maxlen=max_points)},
  
    'obs': deque(maxlen=max_points)
}
start_time = time.time()

# --- CONFIGURAÇÃO DO PLOT ---
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, TIME_WINDOW_SECONDS)
ax.minorticks_on()
ax.grid(which='major', linestyle='-', linewidth='0.7', color='gray')
ax.grid(which='minor', linestyle=':', linewidth='0.5', color='lightgray')

line_volt, = ax.plot([], [], 'b-', label='Tensão (V)')
line_temp, = ax.plot([], [], 'r-', label='Temperatura (°C)')
line_res,  = ax.plot([], [], 'g-', label='Resistência (Ω)')
lines = {'volt': line_volt, 'temp': line_temp, 'res': line_res}


def switch_plot(plot_name):
    global active_plot
    active_plot = plot_name
    for name, line in lines.items():
        line.set_visible(name == plot_name)
    
    if plot_name == 'volt':
        ax.set_title("Gráfico de Tensão vs. Tempo")
        ax.set_ylabel("Tensão (V)")
    elif plot_name == 'temp':
        ax.set_title("Gráfico de Temperatura vs. Tempo")
        ax.set_ylabel("Temperatura (°C)")
    elif plot_name == 'res':
        ax.set_title("Gráfico de Resistência vs. Tempo")
        ax.set_ylabel("Resistência (Ω)")
    
    ax.relim()
    ax.autoscale_view(scalex=False, scaley=True)
    active_line = lines[active_plot]
    ax.legend(handles=[active_line])
    fig.canvas.draw_idle()

def add_observation():
    """Adiciona/edita a observação do último ponto medido.
    Obs.: usa input() no terminal e pausa a animação até você teclar Enter.
    """
    if len(data['volt']['x']) == 0:
        print("Ainda não há dados para anotar.")
        return
    try:
        txt = input("Observação para o último ponto (vazio = limpar): ").strip()
        
        if len(data['obs']) < len(data['volt']['x']):
            data['obs'].append(txt)
        else:
            data['obs'][-1] = txt
        print("Observação registrada.")
    except Exception as e:
        print(f"Não foi possível registrar a observação: {e}")

def on_key_press(event):
    if event.key == '1':
        switch_plot('volt')
    elif event.key == '2':
        switch_plot('temp')
    elif event.key == '3':
        switch_plot('res')
    elif event.key.lower() == 'o':  
        add_observation()
    elif event.key.lower() == 'q':
        plt.close(fig)  

fig.canvas.mpl_connect('key_press_event', on_key_press)


def update(frame):
    if instrument is None:
        return list(lines.values())
    try:
        instrument.write('INITiate')
        values_str = instrument.query('FETCh?')
        readings = [float(v) for v in values_str.strip().split(',')]
        
        new_volt, new_temp, new_res = readings
        current_time = time.time() - start_time
        
        print(f"Dados -> Tempo: {current_time:.2f}s, Tensão: {new_volt:.4f}V, Temp: {new_temp:.2f}°C, Resistência: {new_res:.2f}Ω")
        
        data['volt']['x'].append(current_time)
        data['volt']['y'].append(new_volt)
        data['temp']['x'].append(current_time)
        data['temp']['y'].append(new_temp)
        data['res']['x'].append(current_time)
        data['res']['y'].append(new_res)
        
        data['obs'].append("")

        for name, line in lines.items():
            line.set_data(data[name]['x'], data[name]['y'])

        if current_time >= ax.get_xlim()[1]:
            ax.set_xlim(current_time - TIME_WINDOW_SECONDS, current_time)

        if lines[active_plot].get_visible():
            ax.relim()
            ax.autoscale_view(scalex=False, scaley=True)
    except Exception as e:
        print(f"Ocorreu um erro: {e}")
    return list(lines.values())


def save_data_to_xlsx(all_data):
    if not all_data['volt']['x']:
        print("Nenhum dado foi coletado para salvar.")
        return

    n = len(all_data['volt']['x'])

    obs_list = list(all_data.get('obs', []))
    if len(obs_list) < n:
        obs_list += [''] * (n - len(obs_list))
    elif len(obs_list) > n:
        obs_list = obs_list[:n]

    df_data = {
        'Tempo (s)': list(all_data['volt']['x']),
        'Tensão (V)': list(all_data['volt']['y']),
        'Temperatura (°C)': list(all_data['temp']['y']),
        'Resistência (Ω)': list(all_data['res']['y']),
        'Observações': obs_list  
    }
    df = pd.DataFrame(df_data)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"dados_keysight_{timestamp}.xlsx"

    try:
        with pd.ExcelWriter(filename, engine="xlsxwriter") as writer:
            sheet_name = "Dados"
            df.to_excel(writer, sheet_name=sheet_name, index=False)

            wb = writer.book
            ws = writer.sheets[sheet_name]


            time_fmt = wb.add_format({"num_format": "0.00",      "border": 1})
            volt_fmt = wb.add_format({"num_format": "0.0000",    "border": 1})
            temp_fmt = wb.add_format({"num_format": "#,##0.00",  "border": 1})
            res_fmt  = wb.add_format({"num_format": "#,##0.00",  "border": 1})

            obs_fmt  = wb.add_format({"text_wrap": True, "border": 1})


            ws.set_column(0, 0, 12, time_fmt)   
            ws.set_column(1, 1, 14, volt_fmt)   
            ws.set_column(2, 2, 18, temp_fmt)   
            ws.set_column(3, 3, 18, res_fmt)    
            ws.set_column(4, 4, 40, obs_fmt)    


            ws.freeze_panes(1, 0)


            ws.add_table(
                0, 0, len(df), len(df.columns) - 1,
                {
                    "style": "Table Style Medium 9",
                    "columns": [{"header": h} for h in df.columns]
                }
            )

        print(f"\nDados salvos com sucesso no arquivo: {filename}")
    except Exception as e:
        print(f"Erro ao salvar o arquivo XLSX: {e}")


print("\n--- Iniciando Gráfico Multicanal ---")
print("Use as teclas numéricas para alternar entre os gráficos:")
print("  [1] Tensão")
print("  [2] Temperatura")
print("  [3] Resistência")
print("  [O] Adicionar observação ao último ponto")
print("  [Q] Parar e Salvar XLSX")
print("-" * 35)

switch_plot('volt')

ani = animation.FuncAnimation(fig, update, interval=UPDATE_INTERVAL_MS, blit=False, save_count=200)
plt.show()

save_data_to_xlsx(data)

if instrument:
    instrument.close()
    print("Conexão com o instrumento fechada.")