import {createFileRoute} from '@tanstack/react-router';
import {Settings} from 'lucide-react';
import {EmptyPage} from '@/components/clinic/empty-page';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/_workspace/configuracoes')({head:()=>pageHead('Configurações','As informações que mantêm suas notas em dia.'),component:()=> <EmptyPage title="Configurações" subtitle="As informações que mantêm suas notas em dia." icon={Settings} emptyTitle="Vamos preparar o consultório" description="Dados do emitente, médicos, serviços, alíquotas e parâmetros fiscais serão configurados aqui." stage="M2"/>});
