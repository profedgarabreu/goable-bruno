import {useState} from 'react';
import {CircleHelp,Upload,UserRoundPen,CircleCheckBig,Send,MailCheck} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';

const passos=[
 {icon:Upload,titulo:'Importar',texto:'No fim do dia, traga o relatório do ProntMed em "Importar". Pode ser a planilha, um PDF ou até uma foto da tela.'},
 {icon:UserRoundPen,titulo:'Completar cadastro',texto:'Em "Hoje", quem estiver com "A completar" precisa de CPF ou endereço. Clique em "Completar cadastro" e cole a ficha do ProntMed.'},
 {icon:CircleCheckBig,titulo:'Marcar pago',texto:'Confirme a forma de pagamento e marque "Pago" em cada atendimento que já foi recebido.'},
 {icon:Send,titulo:'Conferir e emitir',texto:'Em "Conferência", olhe as notas prontas, confira valores e nomes e clique em "Aprovar e emitir". Nada é emitido sem você aprovar.'},
 {icon:MailCheck,titulo:'Acompanhar envios',texto:'Em "Notas emitidas", veja se cada paciente recebeu a nota. Se faltar contato, use "Informar contato e enviar".'},
];

export function AjudaRapida(){
 const [open,setOpen]=useState(false);
 return <>
  <Button variant="ghost" size="icon" title="Ajuda rápida" aria-label="Ajuda rápida" onClick={()=>setOpen(true)}><CircleHelp size={18}/></Button>
  <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
   <SheetHeader className="mb-5"><SheetTitle className="text-xl">Passo a passo do dia</SheetTitle><SheetDescription>Cinco etapas, na ordem. Em caso de dúvida, chame a Goable.</SheetDescription></SheetHeader>
   <ol className="grid gap-4">{passos.map((p,i)=><li key={p.titulo} className="flex gap-3 rounded-lg border border-border p-4">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-primary"><p.icon size={20} aria-hidden="true"/></span>
    <div><div className="font-semibold">{i+1}. {p.titulo}</div><p className="text-[15px] text-muted-foreground">{p.texto}</p></div></li>)}</ol>
  </SheetContent></Sheet>
 </>;
}
