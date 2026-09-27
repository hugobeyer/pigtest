import {writeFileSync} from 'node:fs';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins:[{
    name:'save-look',
    apply:'serve',
    configureServer(server){
      for(const name of ['look','feel'])server.middlewares.use(`/__${name}`,(req,res)=>{
        let body='';
        req.on('data',chunk=>body+=chunk);
        req.on('end',()=>{
          writeFileSync(new URL(`./src/${name}.json`,import.meta.url),JSON.stringify(JSON.parse(body),null,2)+'\n');
          res.end('saved');
        });
      });
    }
  }]
});
