type Context={registerTool:(tool:{name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void>};
export function registerProgressTool(getProgress:()=>unknown){
 const context=(document as Document&{modelContext?:Context}).modelContext;
 if(!context?.registerTool)return()=>{};
 const lifecycle=new AbortController();
 try{void Promise.resolve(context.registerTool({name:'read_learning_progress',description:'Read the current device learning progress without changing scores or unlocking levels.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');return getProgress();}},{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser capability. */}
 return()=>lifecycle.abort();
}
