const internalPattern=/(permission denied|violates|relation .* does not exist|column .* does not exist|invalid input syntax|postgres|supabase.*(?:error|status)|zod|json at position|stack trace|pgrst\d+)/iu;

export function userMessage(message:string|undefined,fallback:string){if(!message)return fallback;return internalPattern.test(message)?fallback:message.slice(0,240);}
