import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseApiResponse} from './api';
test('HTML de erro do encaminhamento informa o status HTTP sem tentar usá-lo como JSON',()=>{
 for(const status of [413,401,403,502])assert.throws(()=>parseApiResponse('<html><h1>Error</h1></html>',status,false),new RegExp(`HTTP ${status}`));
 assert.throws(()=>parseApiResponse('<html>Login</html>',200,true),/HTTP 200/);
});
test('preserva mensagens JSON da API e respostas válidas',()=>{
 assert.deepEqual(parseApiResponse('{"ok":true}',200,true),{ok:true});assert.throws(()=>parseApiResponse('{"error":"Origem não permitida"}',403,false),/Origem não permitida/);
});
