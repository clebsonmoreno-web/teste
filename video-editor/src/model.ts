import {z} from 'zod';
export const projectSchema = z.object({
  client: z.string().min(1), source: z.string().min(1),
  width:z.number().int().positive(), height:z.number().int().positive(),
  fps:z.number().positive(), durationSeconds:z.number().positive(),
  icons:z.array(z.object({
    id:z.string(), icon:z.enum(['check','heart','shield','lightbulb']),
    start:z.number().nonnegative(), end:z.number().positive(),
    x:z.number().min(0).max(1), y:z.number().min(0).max(1),
    size:z.number().positive().default(64), color:z.string().default('#ffffff'),
    motion:z.enum(['none','slide','scale']).default('slide'),
  })).superRefine((icons,ctx)=>{
    const ids=new Set();
    icons.forEach((i,n)=>{if(i.end<=i.start || ids.has(i.id))ctx.addIssue({code:'custom',message:'Intervalo inválido ou ID duplicado',path:[n]});ids.add(i.id);});
  }),
}).superRefine((p,ctx)=>{if(p.icons.some(i=>i.end>p.durationSeconds))ctx.addIssue({code:'custom',message:'Ícone ultrapassa o vídeo'});});
export type Project = z.infer<typeof projectSchema>;
