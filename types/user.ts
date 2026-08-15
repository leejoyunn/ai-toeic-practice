export interface AuthUser { id:string; email:string|null; name:string|null; avatarUrl:string|null; }
export interface UserProfile { id:string; displayName:string|null; avatarUrl:string|null; currentEstimatedLevel:number; targetScore:number; learningStage:string; createdAt:string; updatedAt:string; }
