export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      nf_aliquota_mes: {
        Row: {
          aliquota_simples: number
          competencia: string
          created_at: string
          id: string
          informado_em: string
          informado_por: string
          updated_at: string
        }
        Insert: {
          aliquota_simples: number
          competencia: string
          created_at?: string
          id?: string
          informado_em?: string
          informado_por: string
          updated_at?: string
        }
        Update: {
          aliquota_simples?: number
          competencia?: string
          created_at?: string
          id?: string
          informado_em?: string
          informado_por?: string
          updated_at?: string
        }
        Relationships: []
      }
      nf_atendimentos: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          convenio: boolean
          created_at: string
          data_atendimento: string
          demo: boolean
          forma_pagamento:
            | Database["public"]["Enums"]["nf_forma_pagamento"]
            | null
          hash_dedup: string
          id: string
          importacao_id: string | null
          medico_id: string | null
          observacao: string
          paciente_id: string
          pago_ok_em: string | null
          pago_ok_por: string | null
          quantidade: number
          servico_id: string | null
          status: Database["public"]["Enums"]["nf_status_atendimento"]
          updated_at: string
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          convenio?: boolean
          created_at?: string
          data_atendimento: string
          demo?: boolean
          forma_pagamento?:
            | Database["public"]["Enums"]["nf_forma_pagamento"]
            | null
          hash_dedup?: string
          id?: string
          importacao_id?: string | null
          medico_id?: string | null
          observacao?: string
          paciente_id: string
          pago_ok_em?: string | null
          pago_ok_por?: string | null
          quantidade?: number
          servico_id?: string | null
          status?: Database["public"]["Enums"]["nf_status_atendimento"]
          updated_at?: string
          valor?: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          convenio?: boolean
          created_at?: string
          data_atendimento?: string
          demo?: boolean
          forma_pagamento?:
            | Database["public"]["Enums"]["nf_forma_pagamento"]
            | null
          hash_dedup?: string
          id?: string
          importacao_id?: string | null
          medico_id?: string | null
          observacao?: string
          paciente_id?: string
          pago_ok_em?: string | null
          pago_ok_por?: string | null
          quantidade?: number
          servico_id?: string | null
          status?: Database["public"]["Enums"]["nf_status_atendimento"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "nf_atendimentos_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "nf_operadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_atendimentos_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "nf_importacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_atendimentos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "nf_medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "nf_pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_atendimentos_pago_ok_por_fkey"
            columns: ["pago_ok_por"]
            isOneToOne: false
            referencedRelation: "nf_operadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_atendimentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "nf_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_auditoria: {
        Row: {
          acao: string
          antes: Json | null
          depois: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          operador_id: string | null
          quando: string
          user_id: string
        }
        Insert: {
          acao: string
          antes?: Json | null
          depois?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          operador_id?: string | null
          quando?: string
          user_id?: string
        }
        Update: {
          acao?: string
          antes?: Json | null
          depois?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          operador_id?: string | null
          quando?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nf_auditoria_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "nf_operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_emitente: {
        Row: {
          cnpj: string | null
          created_at: string
          email_remetente: string | null
          id: boolean
          inscricao_municipal: string | null
          municipio_ibge: string
          municipio_nome: string
          parametros_validados_em: string | null
          parametros_validados_por: string | null
          razao_social: string
          regime: string
          uf: string
          updated_at: string
          whatsapp_numero: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email_remetente?: string | null
          id?: boolean
          inscricao_municipal?: string | null
          municipio_ibge: string
          municipio_nome: string
          parametros_validados_em?: string | null
          parametros_validados_por?: string | null
          razao_social: string
          regime?: string
          uf: string
          updated_at?: string
          whatsapp_numero?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email_remetente?: string | null
          id?: boolean
          inscricao_municipal?: string | null
          municipio_ibge?: string
          municipio_nome?: string
          parametros_validados_em?: string | null
          parametros_validados_por?: string | null
          razao_social?: string
          regime?: string
          uf?: string
          updated_at?: string
          whatsapp_numero?: string | null
        }
        Relationships: []
      }
      nf_envios: {
        Row: {
          canal: Database["public"]["Enums"]["nf_canal"]
          created_at: string
          destino: string
          enviado_em: string | null
          erro: string | null
          id: string
          nota_id: string
          provider_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["nf_canal"]
          created_at?: string
          destino: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nota_id: string
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["nf_canal"]
          created_at?: string
          destino?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nota_id?: string
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nf_envios_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "nf_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_importacoes: {
        Row: {
          arquivo_path: string | null
          criado_em: string
          data_ref: string
          id: string
          linhas_lidas: number
          linhas_novas: number
          operador_id: string | null
          origem: string
          updated_at: string
        }
        Insert: {
          arquivo_path?: string | null
          criado_em?: string
          data_ref: string
          id?: string
          linhas_lidas?: number
          linhas_novas?: number
          operador_id?: string | null
          origem: string
          updated_at?: string
        }
        Update: {
          arquivo_path?: string | null
          criado_em?: string
          data_ref?: string
          id?: string
          linhas_lidas?: number
          linhas_novas?: number
          operador_id?: string | null
          origem?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nf_importacoes_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "nf_operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_lotes: {
        Row: {
          aprovado_por: string | null
          criado_em: string
          id: string
          status: string
          total_notas: number
          updated_at: string
          valor_total: number
        }
        Insert: {
          aprovado_por?: string | null
          criado_em?: string
          id?: string
          status?: string
          total_notas?: number
          updated_at?: string
          valor_total?: number
        }
        Update: {
          aprovado_por?: string | null
          criado_em?: string
          id?: string
          status?: string
          total_notas?: number
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "nf_lotes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "nf_operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_medicos: {
        Row: {
          ativo: boolean
          created_at: string
          crm: string | null
          id: string
          nome: string
          nome_no_prontmed: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          crm?: string | null
          id?: string
          nome: string
          nome_no_prontmed?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          crm?: string | null
          id?: string
          nome?: string
          nome_no_prontmed?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nf_notas: {
        Row: {
          aliquota_simples_usada: number | null
          ambiente: Database["public"]["Enums"]["nf_ambiente"]
          atendimento_id: string
          cancelada_em: string | null
          chave_acesso: string | null
          created_at: string
          descricao_usada: string | null
          emitida_em: string | null
          id: string
          lote_id: string | null
          mensagem_erro: string | null
          motivo_cancelamento: string | null
          numero: string | null
          parametro_fiscal_id: string | null
          payload_enviado: Json | null
          pdf_path: string | null
          ref_externa: string
          resposta: Json | null
          status: Database["public"]["Enums"]["nf_status_nota"]
          substituida_por: string | null
          updated_at: string
          xml_path: string | null
        }
        Insert: {
          aliquota_simples_usada?: number | null
          ambiente?: Database["public"]["Enums"]["nf_ambiente"]
          atendimento_id: string
          cancelada_em?: string | null
          chave_acesso?: string | null
          created_at?: string
          descricao_usada?: string | null
          emitida_em?: string | null
          id?: string
          lote_id?: string | null
          mensagem_erro?: string | null
          motivo_cancelamento?: string | null
          numero?: string | null
          parametro_fiscal_id?: string | null
          payload_enviado?: Json | null
          pdf_path?: string | null
          ref_externa: string
          resposta?: Json | null
          status?: Database["public"]["Enums"]["nf_status_nota"]
          substituida_por?: string | null
          updated_at?: string
          xml_path?: string | null
        }
        Update: {
          aliquota_simples_usada?: number | null
          ambiente?: Database["public"]["Enums"]["nf_ambiente"]
          atendimento_id?: string
          cancelada_em?: string | null
          chave_acesso?: string | null
          created_at?: string
          descricao_usada?: string | null
          emitida_em?: string | null
          id?: string
          lote_id?: string | null
          mensagem_erro?: string | null
          motivo_cancelamento?: string | null
          numero?: string | null
          parametro_fiscal_id?: string | null
          payload_enviado?: Json | null
          pdf_path?: string | null
          ref_externa?: string
          resposta?: Json | null
          status?: Database["public"]["Enums"]["nf_status_nota"]
          substituida_por?: string | null
          updated_at?: string
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nf_notas_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "nf_atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_notas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "nf_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_notas_parametro_fiscal_id_fkey"
            columns: ["parametro_fiscal_id"]
            isOneToOne: false
            referencedRelation: "nf_parametros_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_notas_substituida_por_fkey"
            columns: ["substituida_por"]
            isOneToOne: false
            referencedRelation: "nf_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_operadores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      nf_pacientes: {
        Row: {
          bairro: string | null
          celular: string | null
          cep: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          demo: boolean
          email: string | null
          id: string
          logradouro: string | null
          municipio_ibge: string | null
          municipio_nome: string | null
          nome: string
          numero: string | null
          origem: string
          prontuario_prontmed: string | null
          regra_especial_id: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio_ibge?: string | null
          municipio_nome?: string | null
          nome: string
          numero?: string | null
          origem?: string
          prontuario_prontmed?: string | null
          regra_especial_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio_ibge?: string | null
          municipio_nome?: string | null
          nome?: string
          numero?: string | null
          origem?: string
          prontuario_prontmed?: string | null
          regra_especial_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nf_pacientes_regra_especial_id_fkey"
            columns: ["regra_especial_id"]
            isOneToOne: false
            referencedRelation: "nf_regras_especiais"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_parametros_fiscais: {
        Row: {
          ativo: boolean
          beneficio_municipal: boolean
          c_ind_op: string | null
          c_trib_mun: string | null
          c_trib_nac: string
          created_at: string
          exigibilidade_suspensa: boolean
          grupo_id: string
          ibscbs_class_trib: string | null
          ibscbs_cst: string | null
          id: string
          iss_retido: boolean
          municipio_incidencia_ibge: string
          nbs: string | null
          nbs_descricao: string | null
          nome: string
          pis_cofins_csll_retencao: string | null
          pis_cofins_cst: string | null
          regime_especial: string
          trib_issqn: string
          updated_at: string
          validacao: Json
          validado_em: string | null
          validado_por: string | null
          valor_aprox_tributos_modo: string
          versao: number
          vigente_desde: string
        }
        Insert: {
          ativo?: boolean
          beneficio_municipal?: boolean
          c_ind_op?: string | null
          c_trib_mun?: string | null
          c_trib_nac: string
          created_at?: string
          exigibilidade_suspensa?: boolean
          grupo_id?: string
          ibscbs_class_trib?: string | null
          ibscbs_cst?: string | null
          id?: string
          iss_retido?: boolean
          municipio_incidencia_ibge: string
          nbs?: string | null
          nbs_descricao?: string | null
          nome: string
          pis_cofins_csll_retencao?: string | null
          pis_cofins_cst?: string | null
          regime_especial?: string
          trib_issqn?: string
          updated_at?: string
          validacao?: Json
          validado_em?: string | null
          validado_por?: string | null
          valor_aprox_tributos_modo?: string
          versao?: number
          vigente_desde?: string
        }
        Update: {
          ativo?: boolean
          beneficio_municipal?: boolean
          c_ind_op?: string | null
          c_trib_mun?: string | null
          c_trib_nac?: string
          created_at?: string
          exigibilidade_suspensa?: boolean
          grupo_id?: string
          ibscbs_class_trib?: string | null
          ibscbs_cst?: string | null
          id?: string
          iss_retido?: boolean
          municipio_incidencia_ibge?: string
          nbs?: string | null
          nbs_descricao?: string | null
          nome?: string
          pis_cofins_csll_retencao?: string | null
          pis_cofins_cst?: string | null
          regime_especial?: string
          trib_issqn?: string
          updated_at?: string
          validacao?: Json
          validado_em?: string | null
          validado_por?: string | null
          valor_aprox_tributos_modo?: string
          versao?: number
          vigente_desde?: string
        }
        Relationships: []
      }
      nf_perfis: {
        Row: {
          criado_em: string
          nome: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          nome?: string
          user_id: string
        }
        Update: {
          criado_em?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      nf_regras_especiais: {
        Row: {
          aguarda_autorizacao: boolean
          ativo: boolean
          created_at: string
          exige_declaracao: boolean
          id: string
          iss_retido: boolean
          nome: string
          observacao: string
          tomador_cnpj: string | null
          tomador_nome: string | null
          updated_at: string
        }
        Insert: {
          aguarda_autorizacao?: boolean
          ativo?: boolean
          created_at?: string
          exige_declaracao?: boolean
          id?: string
          iss_retido?: boolean
          nome: string
          observacao?: string
          tomador_cnpj?: string | null
          tomador_nome?: string | null
          updated_at?: string
        }
        Update: {
          aguarda_autorizacao?: boolean
          ativo?: boolean
          created_at?: string
          exige_declaracao?: boolean
          id?: string
          iss_retido?: boolean
          nome?: string
          observacao?: string
          tomador_cnpj?: string | null
          tomador_nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nf_servicos: {
        Row: {
          aliases_prontmed: string[]
          ativo: boolean
          created_at: string
          descricao_nota: string
          genero: string
          gera_nota: boolean
          id: string
          nome: string
          observacao: string
          ordem: number
          parametro_fiscal_id: string | null
          updated_at: string
          valor_padrao: number | null
        }
        Insert: {
          aliases_prontmed?: string[]
          ativo?: boolean
          created_at?: string
          descricao_nota: string
          genero?: string
          gera_nota?: boolean
          id?: string
          nome: string
          observacao?: string
          ordem?: number
          parametro_fiscal_id?: string | null
          updated_at?: string
          valor_padrao?: number | null
        }
        Update: {
          aliases_prontmed?: string[]
          ativo?: boolean
          created_at?: string
          descricao_nota?: string
          genero?: string
          gera_nota?: boolean
          id?: string
          nome?: string
          observacao?: string
          ordem?: number
          parametro_fiscal_id?: string | null
          updated_at?: string
          valor_padrao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nf_servicos_parametro_fiscal_id_fkey"
            columns: ["parametro_fiscal_id"]
            isOneToOne: false
            referencedRelation: "nf_parametros_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      pend_arquivos: {
        Row: {
          campo_key: string
          enviado_em: string
          enviado_por_nome: string
          id: string
          item_id: string
          mime: string
          nome_original: string
          storage_path: string
          tamanho: number
        }
        Insert: {
          campo_key?: string
          enviado_em?: string
          enviado_por_nome: string
          id?: string
          item_id: string
          mime: string
          nome_original: string
          storage_path: string
          tamanho: number
        }
        Update: {
          campo_key?: string
          enviado_em?: string
          enviado_por_nome?: string
          id?: string
          item_id?: string
          mime?: string
          nome_original?: string
          storage_path?: string
          tamanho?: number
        }
        Relationships: [
          {
            foreignKeyName: "pend_arquivos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pend_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pend_itens: {
        Row: {
          atualizado_em: string
          categoria: string
          comentario_goable: string
          config: Json
          criado_em: string
          descricao: string
          id: string
          link_id: string
          obrigatoria: boolean
          ordem: number
          prioridade: string
          status: string
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: string
          comentario_goable?: string
          config?: Json
          criado_em?: string
          descricao?: string
          id?: string
          link_id: string
          obrigatoria?: boolean
          ordem?: number
          prioridade: string
          status?: string
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string
          comentario_goable?: string
          config?: Json
          criado_em?: string
          descricao?: string
          id?: string
          link_id?: string
          obrigatoria?: boolean
          ordem?: number
          prioridade?: string
          status?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pend_itens_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "pend_links"
            referencedColumns: ["id"]
          },
        ]
      }
      pend_links: {
        Row: {
          ativo: boolean
          criado_em: string
          expira_em: string | null
          id: string
          nome_cliente: string
          token: string
          ultimo_acesso_em: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          expira_em?: string | null
          id?: string
          nome_cliente: string
          token?: string
          ultimo_acesso_em?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          expira_em?: string | null
          id?: string
          nome_cliente?: string
          token?: string
          ultimo_acesso_em?: string | null
        }
        Relationships: []
      }
      pend_respostas: {
        Row: {
          id: string
          item_id: string
          respondido_em: string
          respondido_por_nome: string
          valor: Json
        }
        Insert: {
          id?: string
          item_id: string
          respondido_em?: string
          respondido_por_nome: string
          valor: Json
        }
        Update: {
          id?: string
          item_id?: string
          respondido_em?: string
          respondido_por_nome?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pend_respostas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "pend_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pend_respostas_hist: {
        Row: {
          arquivado_em: string
          id: string
          item_id: string
          respondido_em: string
          respondido_por_nome: string
          valor: Json
        }
        Insert: {
          arquivado_em?: string
          id?: string
          item_id: string
          respondido_em: string
          respondido_por_nome: string
          valor: Json
        }
        Update: {
          arquivado_em?: string
          id?: string
          item_id?: string
          respondido_em?: string
          respondido_por_nome?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pend_respostas_hist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pend_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["nf_papel"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["nf_papel"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["nf_papel"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nf_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["nf_papel"]
          _user_id: string
        }
        Returns: boolean
      }
      nf_hoje: { Args: never; Returns: string }
      nf_parametro_nova_versao: {
        Args: { _dados: Json; _id: string }
        Returns: string
      }
      nf_signup_open: { Args: never; Returns: boolean }
      pend_register_file: {
        Args: {
          _autor: string
          _campo: string
          _item: string
          _max: number
          _mime: string
          _nome: string
          _path: string
          _tamanho: number
          _token: string
        }
        Returns: string
      }
      pend_remove_file: {
        Args: { _file: string; _item: string; _token: string }
        Returns: string
      }
      pend_submit: {
        Args: { _item: string; _nome: string; _token: string; _valor: Json }
        Returns: undefined
      }
      pend_submit_checked: {
        Args: {
          _config: Json
          _item: string
          _nome: string
          _obrigatoria: boolean
          _tipo: string
          _token: string
          _valor: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      nf_ambiente: "mock" | "homologacao" | "producao"
      nf_canal: "email" | "whatsapp"
      nf_forma_pagamento: "pix" | "credito" | "debito" | "dinheiro" | "outro"
      nf_papel: "consultorio" | "admin_goable"
      nf_status_atendimento:
        | "importado"
        | "cadastro_pendente"
        | "aguardando_pagamento"
        | "pago_ok"
        | "aguardando_autorizacao"
        | "aprovado"
        | "emitindo"
        | "emitido"
        | "erro_emissao"
        | "enviado"
        | "erro_envio"
        | "nao_gera_nota"
        | "cancelado"
      nf_status_nota:
        | "pendente"
        | "processando"
        | "autorizada"
        | "erro"
        | "cancelada"
        | "substituida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      nf_ambiente: ["mock", "homologacao", "producao"],
      nf_canal: ["email", "whatsapp"],
      nf_forma_pagamento: ["pix", "credito", "debito", "dinheiro", "outro"],
      nf_papel: ["consultorio", "admin_goable"],
      nf_status_atendimento: [
        "importado",
        "cadastro_pendente",
        "aguardando_pagamento",
        "pago_ok",
        "aguardando_autorizacao",
        "aprovado",
        "emitindo",
        "emitido",
        "erro_emissao",
        "enviado",
        "erro_envio",
        "nao_gera_nota",
        "cancelado",
      ],
      nf_status_nota: [
        "pendente",
        "processando",
        "autorizada",
        "erro",
        "cancelada",
        "substituida",
      ],
    },
  },
} as const
