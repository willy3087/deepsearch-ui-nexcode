#!/bin/bash

# Definir variáveis de ambiente
export NODE_ENV=development

# Usar porta fixa 8080
SELECTED_PORT=8080

# Função para matar processo em uma porta
kill_process_on_port() {
    local port=$1
    if lsof -i:$port > /dev/null 2>&1; then
        echo "AVISO: Porta $port já está em uso. Tentando encerrar o processo..."
        local PID=$(lsof -i:$port -P -n -t)
        if [ ! -z "$PID" ]; then
            echo "Encerrando processo $PID na porta $port"
            # Primeiro tenta com SIGTERM
            kill $PID 2>/dev/null
            sleep 1
            
            # Se ainda estiver rodando, tenta com SIGKILL
            if lsof -i:$port > /dev/null 2>&1; then
                echo "Processo ainda ativo, usando SIGKILL..."
                kill -9 $PID
                sleep 1
            fi
            
            # Verifica se o processo foi realmente encerrado
            if lsof -i:$port > /dev/null 2>&1; then
                echo "ERRO: Não foi possível encerrar o processo na porta $port"
                exit 1
            else
                echo "Processo encerrado com sucesso"
            fi
        fi
    fi
}

# Tentar encerrar qualquer processo existente na porta
kill_process_on_port $SELECTED_PORT

# Gravar a porta no arquivo para que o Admin Panel possa ler
echo $SELECTED_PORT > ./.port.txt

# Iniciar o servidor
echo "Iniciando DeepSearch UI Jina..."
echo "Porta: $SELECTED_PORT (fixa)"
echo "-------------------------------------------"

# Usar servidor HTTP simples do Python para servir arquivos estáticos
python -m http.server $SELECTED_PORT
