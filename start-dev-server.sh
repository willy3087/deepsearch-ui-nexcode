#!/bin/bash

# Definir variáveis de ambiente
export NODE_ENV=development

# Usar porta fixa 8080
SELECTED_PORT=8080

# Verificar se a porta já está em uso
if lsof -i:$SELECTED_PORT > /dev/null 2>&1; then
  echo "AVISO: Porta $SELECTED_PORT já está em uso. Tentando encerrar o processo..."
  # Tentar matar o processo que está usando a porta
  PID=$(lsof -i:$SELECTED_PORT -P -n -t)
  if [ ! -z "$PID" ]; then
    echo "Encerrando processo $PID na porta $SELECTED_PORT"
    kill -9 $PID
    sleep 1
  fi
fi

# Gravar a porta no arquivo para que o Admin Panel possa ler
echo $SELECTED_PORT > ./.port.txt

# Iniciar o servidor
echo "Iniciando DeepSearch UI Jina..."
echo "Porta: $SELECTED_PORT (fixa)"
echo "-------------------------------------------"

# Usar servidor HTTP simples do Python para servir arquivos estáticos
python -m http.server $SELECTED_PORT
