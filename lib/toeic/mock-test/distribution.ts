import type { ToeicPart } from "@/types/toeic";
import type { MockKind,MockMode } from "@/lib/toeic/mock-test/config";

export type PartDistribution=Record<ToeicPart,number>;
const zero=():PartDistribution=>({1:0,2:0,3:0,4:0,5:0,6:0,7:0});
const FULL:PartDistribution={1:6,2:25,3:39,4:30,5:30,6:16,7:54};
const MIXED:Record<20|50|100,PartDistribution>={
  20:{1:2,2:3,3:3,4:2,5:4,6:2,7:4},
  50:{1:3,2:7,3:10,4:5,5:8,6:5,7:12},
  100:{1:4,2:13,3:18,4:15,5:15,6:8,7:27},
};
const READING:Record<20|50|100,PartDistribution>={
  20:{...zero(),5:8,6:4,7:8},50:{...zero(),5:16,6:8,7:26},100:{...zero(),5:30,6:16,7:54},
};
const LISTENING:Record<20|50|100,PartDistribution>={
  20:{...zero(),1:2,2:5,3:7,4:6},50:{...zero(),1:3,2:13,3:19,4:15},100:{...zero(),1:6,2:25,3:39,4:30},
};

export function mockDistribution(kind:MockKind,count:number,mode:MockMode):PartDistribution{
  if(kind==="full")return FULL;
  const size=count as 20|50|100;
  return (mode==="reading"?READING:mode==="listening"?LISTENING:MIXED)[size];
}

export function orderedParts(distribution:PartDistribution){return ([1,2,3,4,5,6,7]as ToeicPart[]).filter((part)=>distribution[part]>0);}

export function generationBatches(total:number,max=5){const batches:number[]=[];let remaining=total;while(remaining>0){let size=Math.min(max,remaining);if(remaining-size===1&&size>2)size-=1;batches.push(size);remaining-=size;}return batches;}
