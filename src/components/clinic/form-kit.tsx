import type {ReactNode} from 'react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
import {Loader2} from 'lucide-react';

export const d=(v:string)=>v.replace(/\D/g,'');
export const maskCPF=(v:string)=>d(v).slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
export const maskCNPJ=(v:string)=>d(v).slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
export const maskCEP=(v:string)=>d(v).slice(0,8).replace(/(\d{5})(\d)/,'$1-$2');
export function maskFone(v:string){const x=d(v).slice(0,11);if(x.length<=2)return x;if(x.length<=6)return `(${x.slice(0,2)}) ${x.slice(2)}`;if(x.length<=10)return `(${x.slice(0,2)}) ${x.slice(2,6)}-${x.slice(6)}`;return `(${x.slice(0,2)}) ${x.slice(2,7)}-${x.slice(7)}`;}
export function erroAmigavel(e:unknown){const m=e instanceof Error?e.message:String(e);try{const j=JSON.parse(m);if(Array.isArray(j))return j.map((x:{message?:string})=>x.message).filter(Boolean).join(' ');}catch{/* plain */}return m||'Não foi possível salvar. Tente novamente.';}

export function Field({label,hint,error,children,className=''}:{label:string;hint?:ReactNode;error?:string|null;children:ReactNode;className?:string}){
 return <div className={`grid gap-1.5 ${className}`}><label className="grid gap-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>{error?<p className="text-sm text-destructive">{error}</p>:hint?<p className="text-xs text-muted-foreground">{hint}</p>:null}</div>;
}

export function EditDrawer({open,onOpenChange,title,description,children,onSave,saving,canSave=true}:{open:boolean;onOpenChange:(o:boolean)=>void;title:string;description?:string;children:ReactNode;onSave?:()=>void;saving?:boolean;canSave?:boolean}){
 return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto flex flex-col gap-0"><SheetHeader className="mb-5"><SheetTitle className="text-xl">{title}</SheetTitle>{description&&<SheetDescription>{description}</SheetDescription>}</SheetHeader><div className="grid gap-4 flex-1">{children}</div>{onSave&&<div className="sticky bottom-0 -mx-6 mt-6 border-t border-border bg-background px-6 py-4"><Button variant="action" size="lg" className="w-full h-12 text-base" disabled={saving||!canSave} onClick={onSave}>{saving&&<Loader2 className="animate-spin"/>}Salvar</Button></div>}</SheetContent></Sheet>;
}

export function Pill({tone,children}:{tone:'success'|'error'|'warning'|'info'|'muted';children:ReactNode}){return <span className={`status-badge tone-${tone}`}>{children}</span>;}

export function DataTable({head,children,empty}:{head:string[];children:ReactNode;empty?:boolean}){
 return <div className="table-section"><div className="table-scroll"><table className="config-table"><thead><tr>{head.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty&&<p className="p-6 text-center text-muted-foreground">Nada cadastrado ainda.</p>}</div></div>;
}
