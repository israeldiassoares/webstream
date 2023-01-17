const API_URL = "http://localhost:3000"
let counter = 0

async function consumeAPI(signal) {
    //request via fetch nativo do js
    const response = await fetch(API_URL, {
        signal
    })
    const reader = response.body
    //fazendo leitura do body, composicao de receber stream de text decodificado
    .pipeThrough(new TextDecoderStream())// binario para string
    .pipeThrough(paseNDJSON()) //string para json chamando a funcao paserNDJSON direto no transform pois é uma transformStream
    //fazer a gravacao da stream escrevendo o chunk recebido
    // .pipeTo(new WritableStream({
    //     write(chunk){
    //         console.log(
    //             ++counter,
    //              'chunk',
    //               chunk);
    //     }
    // }))
    return reader
}
//plotar as infos no html
function appendToHTML(element) {
    return new WritableStream({
        //stream de gracavao de linhas e insercao no dom
        write({title, description, url_anime}){
            const card = `
            <article>
                <div class="text">
                    <h3>[${++counter}]${title}</h3>
                        <p>${description.slice(0,100)}</p>
                        <a href="${url_anime}">${url_anime}</a>
                </div>
            </article>
            `
            element.innerHTML += card
        },
        abort(reason){
            console.log('aborted', reason)
        }
    })
}
/**Funcao que garante caso dois ou mais chunks chegem em uma unica transmissao converta corretamente para JSON */
//dado: {}\n{}
/* deve virar :
    {}
    {}
    */
function paseNDJSON(){
    let ndjsonBuffer= ''
    //retona uma stream transformada recebendo um chunk e o controlle = O controller manda os dados para frente
    return new TransformStream({
        //transform para transformar o chunk e o controle para seguir pra frente
        transform(chunk,controller){
            //concatena o chunk, agrupando os dados do msm item "mesma linha" identificando quando acaba e ir para outro item
            ndjsonBuffer += chunk
            const items = ndjsonBuffer.split('\n')
            items.slice(0, -1)
            .forEach( item => controller.enqueue(JSON.parse(item)))

            //limpar buffer, guardando todo o item q tinha
            ndjsonBuffer = items[items.length -1]
        },
        //Caso tenha acabado de processar e contenha alguma informacao parada ou se tiver algo para ser processado
        flush(controller){
            //se nao tiver nada (estiver vazio) tem q retornar
            if(ndjsonBuffer) return
            //caso contrario ele efetuar o tapiinha nas costas e termina de parsear e manda pra frente
            controller.enqueue(JSON.parse(ndjsonBuffer))
        }
    })
}

const [
    start,
    stop,
    cards
] = ['start', 'stop', 'cards'].map(item => document.getElementById(item))
/* cancelar operação no js mandando sinal para a funcao q esta fazendo a chamada para a api*/
let abortController = new AbortController()

// encapsulando a lógica para denttro do evento do click de start iniciando o processamento
start.addEventListener('click', async () =>{
    try {
        const readable = await consumeAPI(abortController.signal)
        //na hora que é chamado o abort ele para instantaneamente o consumo de dados e cancelando todas as operacoes de consumo
        // abortController.abort()
    await readable.pipeTo(appendToHTML(cards), { signal: abortController.signal})
    } catch (error) {
        if(!error.message.includes('abort')) throw error
    }
})

stop.addEventListener('click', async()=>{
    abortController.abort()
    console.log('aborting...')
    abortController = new AbortController()
})