import {projectSchema,type Project} from '../src/model';
export function validateUpdate(original:Project,input:unknown):Project{
 const project=projectSchema.parse(input);
 for(const key of ['source','width','height','fps','durationSeconds'] as const)if(project[key]!==original[key])throw Error('Metadados originais não podem ser alterados.');
 if(project.icons.length>500)throw Error('Limite de 500 ícones por vídeo.');
 return project;
}
