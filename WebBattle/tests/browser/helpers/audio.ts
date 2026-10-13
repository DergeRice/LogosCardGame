export function observeRecordedAudio(){
 (window as any).__recordedBuffers=[];
 const original=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(...args:Parameters<AudioBufferSourceNode['start']>){
  if(this.buffer&&this.buffer.length>1){const data=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));const record={duration:this.buffer.duration,peak,start:performance.now(),end:0};(window as any).__recordedBuffers.push(record);const ended=this.onended;this.onended=e=>{record.end=performance.now();ended?.call(this,e)};}
  return original.apply(this,args);
 };
}
