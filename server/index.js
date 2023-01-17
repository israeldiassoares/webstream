import { createServer} from "node:http" // criador de server
import { createReadStream } from 'node:fs' // leitor de arquivo
import { Readable, Transform } from 'node:stream' // manipular dados como fonte de dados, cria uma stream web a partir de uma stream do node
import {WritableStream, TransformStream} from 'node:stream/web' //
import csvtojson from 'csvtojson'
import { setTimeout } from 'node:timers/promises'

//API rest pega dados joga pra memoria para enviar tudo de uma vez
//webstream é retornado dados sobre demanda de requisicao

const PORT = 3000


// executar verificação de request no serve com header com o comando abaixo
// curl -i -N -X OPTIONS localhost:3000
// curl -N localhost:3000

//Criando server com request e response assincrono
/* Request e response sao nodeJs stream trabalham com protocolo socket == se estiver lendo dados rápidos, ele tem a inteligencia de pausar, limpar a fila e continuar a mandar os dados para o continuar o stream */
createServer(async(request, response) => {
    //librando acesso CORS (sem lib externa), atraves dos headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*'
    }
    //primeira Request que o browser faz é no options e pergunta se a API está livre para ser acessada, dados corretos para acesso
    if(request.method === "OPTIONS"){
        //Respondendo que está disponível para acessar e responde com os headers
        response.writeHead(204, headers)
        //fechando o recurso após a resposta
        response.end()
        return;
    }

    let items = 0;
    request.once('close', _ => console.log(`connection was closed | ${items}`))
    //Assim q chegar uma solicitacao que nao é options vai ser chamado o leitor de arquivo
    //stream do node  !== webStreams
    //criado pipeTo do writableStream(web) para acessar funcoes especificas e passar chunks
    /* Convertido stream de node(back) para stream de web (front) */
    Readable.toWeb(createReadStream('./animeflv.csv'))
    //pipeThrough passo a passo que cada item individual vai trafegar
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(new TransformStream({
        //Quebrando em chunks de nodeStream passando para chunks de webStream
        transform(chunk, controller) {
            const data = JSON.parse(Buffer.from(chunk).toString())
            const mappedData = {
                title: data.title,
                description: data.description,
                url_anime: data.url_anime
            }
            //quebra de linha, pois é um NDJSON
            controller.enqueue(JSON.stringify(mappedData).concat('\n'))
            /** importante manter a quebra de linha como boa prática */
        }

    }))
    //pipTo é última etapa do stream
    .pipeTo(new WritableStream({
      async write(chunk) {
            await setTimeout(200)
            items++
            response.write(chunk)
        },
        close(){
            response.end()
        }
    }))

    // .pipe(response) // <- pipe do node js que não existe no stream web

    //Caso contrário responde ok e passa os headers || manipulacao do CORS
    response.writeHead(200, headers)
    // response.end('ok')
})
.listen(PORT)//escutando o server criado na porta
.on('listening', _ => console.log(`Server is running at ${PORT}`)) //quando o server estiver ONline retornará a msg