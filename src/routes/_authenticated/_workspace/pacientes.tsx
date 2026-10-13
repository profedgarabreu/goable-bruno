import {createFileRoute} from '@tanstack/react-router';
import {Users} from 'lucide-react';
import {EmptyPage} from '@/components/clinic/empty-page';
import {pageHead} from '@/lib/clinic';
export const Route=createFileRoute('/_authenticated/_workspace/pacientes')({head:()=>pageHead('Pacientes','O cadastro do consultório, sempre à mão.'),component:()=> <EmptyPage title="Pacientes" subtitle="O cadastro do consultório, sempre à mão." icon={Users} emptyTitle="Nenhum paciente cadastrado" description="Consulte e complete CPF, endereço e contatos dos pacientes do consultório." stage="M2"/>});
