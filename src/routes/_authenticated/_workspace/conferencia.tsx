import {createFileRoute} from '@tanstack/react-router';
import {ClipboardCheck} from 'lucide-react';
import {EmptyPage} from '@/components/clinic/empty-page';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/_workspace/conferencia')({head:()=>pageHead('Conferência','Uma última conferência antes de emitir.'),component:()=> <EmptyPage title="Conferência" subtitle="Uma última conferência antes de emitir." icon={ClipboardCheck} emptyTitle="Nenhuma nota para conferir" description="Os atendimentos pagos e com cadastro completo aparecerão aqui para sua aprovação." stage="M4"/>});
