import {createFileRoute} from '@tanstack/react-router';
import {ChartNoAxesCombined} from 'lucide-react';
import {EmptyPage} from '@/components/clinic/empty-page';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/_workspace/historico')({head:()=>pageHead('Histórico mensal','Tudo organizado para o fechamento do mês.'),component:()=> <EmptyPage title="Histórico mensal" subtitle="Tudo organizado para o fechamento do mês." icon={ChartNoAxesCombined} emptyTitle="Seu histórico começa aqui" description="Consulte os totais por médico, serviço e pagamento e reúna os documentos para o contador." stage="M6"/>});
