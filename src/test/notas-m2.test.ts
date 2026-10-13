import {describe,it,expect} from 'vitest';
import {validarCNPJ,renderTexto,pendenciasCadastro,diffCampos,aliquotaValida,normalizarFicha,montarDescricao} from '@/lib/notas/rules';

const FICHA='Número de prontuário 48213  Nome Maria Aparecida Souza Lima  Celular (31) 99876-5432  Cpf 529.982.247-25  Quem indicou Dr. Paulo  Data de nascimento 12/03/1968  Naturalidade Belo Horizonte  Sexo Feminino  Estado civil Casada  Endereço Rua dos Timbiras, 1200, apto 501, Funcionários, Belo Horizonte - MG, 30140-061';

describe('M2 rules',()=>{
 it('valida CNPJ',()=>{expect(validarCNPJ('11.222.333/0001-81')).toBe(true);expect(validarCNPJ('11.222.333/0001-82')).toBe(false);expect(validarCNPJ('00000000000000')).toBe(false);});
 it('alíquota aceita só 0 a 33%',()=>{expect(aliquotaValida(0)).toBe(true);expect(aliquotaValida(33)).toBe(true);expect(aliquotaValida(33.01)).toBe(false);expect(aliquotaValida(-1)).toBe(false);});
 it('prévia muda com o gênero',()=>{expect(montarDescricao(1,{descricao_nota:'consulta médica',genero:'a'})).toBe('01 (uma) consulta médica');expect(montarDescricao(1,{descricao_nota:'retorno médico',genero:'o'})).toBe('01 (um) retorno médico');});
 it('renderiza variáveis dos textos',()=>{expect(renderTexto('Olá, {{nome}}! {{valor}} {{x}}',{nome:'Ana',valor:'R$ 1'})).toBe('Olá, Ana! R$ 1 {{x}}');});
 it('motivos de cadastro incompleto',()=>{expect(pendenciasCadastro({cpf:null,cep:'30140061',logradouro:'Rua',numero:'',municipio_ibge:'3106200'})).toEqual(['sem CPF','endereço sem número']);expect(pendenciasCadastro({cpf:'52998224725',cep:'30140061',logradouro:'Rua',numero:'1',municipio_ibge:'3106200'})).toEqual([]);});
 it('auditoria guarda só campos alterados',()=>{expect(diffCampos({nome:'A',cpf:'1',updated_at:'x'},{nome:'A',cpf:'2',updated_at:'y'})).toEqual({antes:{cpf:'1'},depois:{cpf:'2'}});});
 it('normaliza a ficha de teste e descarta o que não está no texto',()=>{
  const {ficha}=normalizarFicha({nome:'Maria Aparecida Souza Lima',cpf:'529.982.247-25',celular:'(31) 99876-5432',email:'maria@exemplo.com',cep:'30140-061',logradouro:'Rua dos Timbiras',numero:'1200',complemento:'apto 501',bairro:'Funcionarios',municipio_nome:'Belo Horizonte',uf:'mg',data_nascimento:'12/03/1968'},FICHA);
  expect(ficha).toMatchObject({cpf:'52998224725',celular:'31998765432',cep:'30140061',logradouro:'Rua dos Timbiras',numero:'1200',complemento:'apto 501',bairro:'Funcionarios',municipio_nome:'Belo Horizonte',uf:'MG',email:null});
 });
});
