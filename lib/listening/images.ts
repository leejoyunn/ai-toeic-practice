import type{GeneratedListeningQuestion}from"@/lib/ai/listening-schema";
type ListeningImage=NonNullable<GeneratedListeningQuestion["image"]>;
export const listeningImages:ListeningImage[]=[
 {id:"office-meeting",imageUrl:"/listening/office-meeting.jpg",description:"Two colleagues are seated at a table in a bright office and reviewing documents together.",tags:["office","meeting","documents"],scene:"modern office meeting area",objects:["table","chairs","documents","laptop"],actions:["reviewing documents","sitting","discussing work"],isActive:true},
 {id:"station-platform",imageUrl:"/listening/station-platform.jpg",description:"Travelers are waiting with luggage on a railway station platform.",tags:["travel","station","luggage"],scene:"railway station platform",objects:["train","suitcases","platform signs"],actions:["waiting","carrying luggage","boarding"],isActive:true},
];
export function getListeningImage(id?:string){return listeningImages.find((image)=>image.id===id&&image.isActive)??listeningImages.find((image)=>image.isActive);}
