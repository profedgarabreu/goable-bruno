import {createFileRoute} from '@tanstack/react-router';
import {FileText} from 'lucide-react';
import {EmptyPage} from '@/components/clinic/empty-page';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/_workspace/notas')({head:()=>pageHead('Notas emitidas','Acompanhe a emissão e o envio de cada nota.'),component:()=> <EmptyPage title="Notas emitidas" subtitle="Acompanhe a emissão e o envio de cada nota." icon={FileText} emptyTitle="Nenhuma nota emitida" description="Suas notas, comprovantes de envio e opções de reenvio ficarão reunidos aqui." stage="M4 e M5"/>});
