// Configurações embutidas (já prontas, não precisa mexer).
//
// Token da brapi.dev para preços de Ações BR e FIIs. Vem como padrão para o
// app funcionar sozinho. Você pode trocar a qualquer momento na aba
// Configurações (o que você digitar lá tem prioridade sobre este aqui).
//
// Obs: por ser um token gratuito e de leitura, deixá-lo no código é de baixo
// risco. Se um dia notar que estourou o limite, gere outro em brapi.dev/dashboard.
export const DEFAULT_BRAPI_TOKEN = '9AfbiHSHkxDoQd2V777hA6'

// De quanto em quanto tempo os preços são considerados "frescos".
// Ao abrir o app, se a última atualização foi há mais que isso, ele atualiza sozinho.
export const PRICE_CACHE_MINUTES = 15
