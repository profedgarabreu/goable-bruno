import {createFileRoute} from '@tanstack/react-router';
import {Upload} from 'lucide-react';
import {EmptyPage} from '@/components/clinic/empty-page';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/_workspace/importar')({head:()=>pageHead('Importar atendimentos','Organize os atendimentos antes de conferir as notas.'),component:()=> <EmptyPage title="Importar atendimentos" subtitle="Organize os atendimentos antes de conferir as notas." icon={Upload} emptyTitle="Nenhum arquivo importado" description="Importe o relatório do ProntMed ou inclua um atendimento manualmente." stage="M3"/>});
