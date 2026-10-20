/**
 * BASE DE CÓDIGOS VALE x U&M
 * Fonte: Árvore de códigos Vale x U&M v1 (material de treinamento HxGN OP Pro)
 */

export interface CodigoValeGroup {
  nome: string;
  codigos: string[];
  sit: 'EXEC' | 'AG';
  resp: 'MANUTENCAO' | 'PRODUCAO' | 'VALE' | 'EXTERNO' | 'ACIDENTE' | 'A_DEFINIR';
  quem: string;
  expurgo: string;
  ex: string;
}

export interface CodigoValeFlat {
  codigo: string;          // ex: "HMC 9120"
  nome: string;            // ex: "AG OPERACAO"
  rotuloCompleto: string;  // ex: "HMC 9120 – AG OPERACAO"
  prefixo: string;         // ex: "HMC"
  numero: string;          // ex: "9120"
  sit: 'EXEC' | 'AG';
  resp: 'MANUTENCAO' | 'PRODUCAO' | 'VALE' | 'EXTERNO' | 'ACIDENTE' | 'A_DEFINIR';
  quem: string;
  expurgo: string;
  ex: string;
  aValidar: boolean;
}

export const CODIGOS_VALE: CodigoValeGroup[] = [
  {"nome":"EXEC MANUT","codigos":["MPS 7000","MPNS 8000","HMC 9000"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Qualquer manutenção. 7000 preventiva, 9000 corretiva (8000 programada, se a gestão decidir usar MPNS)."},
  {"nome":"EXEC PERIC ACIDENTE","codigos":["HAC 1091"],"sit":"EXEC","resp":"ACIDENTE","quem":"Apuração do acidente","expurgo":"Definido na apuração do acidente","ex":"Perícia do acidente em andamento."},
  {"nome":"EXEC MANUT ACIDENTE","codigos":["HAC 1090"],"sit":"EXEC","resp":"ACIDENTE","quem":"Apuração do acidente","expurgo":"Definido na apuração do acidente","ex":"Manutenção executando reparo após acidente."},
  {"nome":"EXEC SIST EMBARCADOS/AUTOMACAO","codigos":["MPS 7031","MPNS 8031","HMC 9031"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"A decidir com a Vale (D-09): instalação e falha do Hexagon","ex":"Serviço em sistema embarcado: Hexagon/tablet, câmera, CAS, telemetria."},
  {"nome":"AG LIBERACAO DE ACESSO","codigos":["MPS 7115","MPNS 8115","HMC 9115"],"sit":"AG","resp":"PRODUCAO","quem":"Dono de Acesso / vias","expurgo":"SIM","ex":"Manutenção não chega na máquina porque o acesso precisa ser acertado pela operação."},
  {"nome":"AG BORRACHARIA","codigos":["MPS 7110","MPNS 8110","HMC 9110"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Borracharia","expurgo":"Depende do dono da borracharia","ex":"Aguardando borracheiro."},
  {"nome":"AG COMBOIO","codigos":["HMC 9113"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Comboio de lubrificação / atendimento de campo da manutenção","expurgo":"Depende do dono do comboio","ex":"Manutenção de campo aguardando comboio (caminhão/técnico)."},
  {"nome":"AG CONDICAO SEGURA","codigos":["MPS 7114","MPNS 8114","HMC 9114"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Segregação / isolamento da área (leiras)","expurgo":"Caso a caso","ex":"Manutenção interrompida esperando condição segura / ferramenta de segurança."},
  {"nome":"AG DETONACAO","codigos":["MPS 7125","MPNS 8125","HMC 9125"],"sit":"AG","resp":"PRODUCAO","quem":"Dono de Detonação (fogo)","expurgo":"SIM","ex":"Manutenção parada porque a máquina está no cerco da detonação."},
  {"nome":"AG LOCOMOCAO","codigos":["MPS 7116","MPNS 8116","HMC 9116"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Prancha / carreta (transporte de equipamento)","expurgo":"Depende do dono da prancha","ex":"Máquina indo (ou aguardando ir) para a oficina: deslocando ou esperando prancha."},
  {"nome":"AG LUBRIFICACAO","codigos":["MPS 7117","MPNS 8117","HMC 9117"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Comboio de lubrificação / atendimento de campo da manutenção","expurgo":"Depende do dono do comboio","ex":"Aguardando lubrificação."},
  {"nome":"AG RECURSO/FERRAMENTAL","codigos":["MPS 7121","MPNS 8121","HMC 9121"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Munck, ponte rolante e ferramental especial","expurgo":"Depende do dono do recurso","ex":"Aguardando recurso (munck, ponte rolante) ou ferramenta."},
  {"nome":"AG OPERACAO","codigos":["MPS 7120","MPNS 8120","HMC 9120"],"sit":"AG","resp":"PRODUCAO","quem":"Dono de Operador para deslocar/testar a máquina em manutenção","expurgo":"SIM","ex":"Máquina quebrada; a manutenção está esperando a Produção."},
  {"nome":"AG PTS","codigos":["MPS 7135","MPNS 8135","HMC 9135"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Emissão / liberação de PTS","expurgo":"SIM, se a PTS depende de outra área","ex":"Aguardando PTS (permissão de trabalho) para iniciar a manutenção."},
  {"nome":"AG ATENDIMENTO","codigos":["MPS 7130","MPNS 8129","HMC 9130"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"A máquina parou por falha e a manutenção AINDA NÃO assumiu (da parada até o aviso/chegada)."},
  {"nome":"AG AVALIACAO","codigos":["MPNS 8108","HMC 9108"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Parada aguardando avaliação: ainda não se sabe se é falha."},
  {"nome":"AG ENERGIA","codigos":["MPS 7127","MPNS 8127","HMC 9127"],"sit":"AG","resp":"EXTERNO","quem":"Externo","expurgo":"A validar com a Vale (concessionária)","ex":"Manutenção parada por falta de energia da concessionária."},
  {"nome":"AG MANUT","codigos":["HMC 9100"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"A máquina parou para manutenção, mas a manutenção ainda não começou (ex.: falta levar até a oficina, falta mão de obra)."},
  {"nome":"AG MAU TEMPO","codigos":["MPS 7126","MPNS 8126","HMC 9126"],"sit":"AG","resp":"EXTERNO","quem":"Externo","expurgo":"A validar com a Vale","ex":"Manutenção parada por chuva/raios/neblina."},
  {"nome":"AG MAO DE OBRA","codigos":["MPS 7119","MPNS 8119","HMC 9119"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando mão de obra (sem especificar)."},
  {"nome":"AG PTS ACIDENTE","codigos":["HAC 1135"],"sit":"AG","resp":"ACIDENTE","quem":"Apuração do acidente","expurgo":"Definido na apuração do acidente","ex":"Aguardando PTS para tratar o acidente."},
  {"nome":"AG PERICIA ACIDENTE","codigos":["HAC 1191"],"sit":"AG","resp":"ACIDENTE","quem":"Apuração do acidente","expurgo":"Definido na apuração do acidente","ex":"Aguardando perícia."},
  {"nome":"AG PECAS","codigos":["MPS 7118","MPNS 8118","HMC 9118"],"sit":"AG","resp":"MANUTENCAO","quem":"Dono de Almoxarifado / suprimentos (peças)","expurgo":"NÃO","ex":"Falha já conhecida, aguardando peça/material."},
  {"nome":"AG MANUT ACIDENTE","codigos":["HAC 1190"],"sit":"AG","resp":"ACIDENTE","quem":"Apuração do acidente","expurgo":"Definido na apuração do acidente","ex":"Aguardando reparo após acidente."},
  {"nome":"AG SIST EMBARCADOS/AUTOMACAO","codigos":["MPS 7131","MPNS 8131","HMC 9131"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Sistemas embarcados / Hexagon","expurgo":"A decidir com a Vale (D-09): instalação e falha do Hexagon","ex":"Aguardando técnico de sistemas embarcados."},
  {"nome":"AG BOX","codigos":["MPS 7112","MPNS 8112","HMC 9112"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando vaga na oficina."},
  {"nome":"EXEC BORRACHARIA","codigos":["MPS 7010","MPNS 8010","HMC 9010"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Borracheiro trabalhando."},
  {"nome":"EXEC CALDERARIA/SOLDA","codigos":["MPNS 8024","HMC 9024"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Solda/caldeiraria."},
  {"nome":"EXEC DIAGNOSTICO TECNICO","codigos":["MPNS 8009"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Técnico diagnosticando a causa de uma falha."},
  {"nome":"EXEC SISTEMAS SEGURANCA","codigos":["MPS 7037","MPNS 8037","HMC 9037"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Instalação/manutenção de dispositivo de segurança (antifadiga, SEVA etc.)."},
  {"nome":"EXEC ELETRONICA/AUTOMACAO","codigos":["MPS 7003","MPNS 8003","HMC 9003"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Técnico de eletrônica/automação trabalhando."},
  {"nome":"EXEC ELETRICA","codigos":["MPS 7002","MPNS 8002","HMC 9002"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Eletricista trabalhando."},
  {"nome":"EXEC GARANTIA / ASSIST TECNICA","codigos":["MPS 7023","MPNS 8023","HMC 9023"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Serviço em garantia / assistência técnica do fabricante."},
  {"nome":"EXEC INSP ELETRICA","codigos":["MPS 7004"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Inspetor elétrico fazendo inspeção periódica."},
  {"nome":"EXEC INSP MECANICA","codigos":["MPS 7005"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Inspetor mecânico fazendo inspeção periódica."},
  {"nome":"EXEC LAVADOR","codigos":["MPS 7011","MPNS 8011","HMC 9011"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Máquina sendo lavada para manutenção."},
  {"nome":"EXEC LUBRIFICACAO","codigos":["MPS 7017","MPNS 8017","HMC 9017"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Lubrificação/troca ou complemento de óleo."},
  {"nome":"EXEC MECANICA","codigos":["MPS 7001","MPNS 8001","HMC 9001"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Mecânico trabalhando na máquina."},
  {"nome":"EXEC PREDITIVA","codigos":["MPS 7006","MPNS 8006"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Coleta/análise preditiva (vibração, termografia, óleo)."},
  {"nome":"EXEC TELECOM/REDES COM","codigos":["MPS 7036","MPNS 8036","HMC 9036"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Serviço em rádio, antena, comunicação."},
  {"nome":"EXEC MANUT SISTEMA DE COMBUSTIVEL","codigos":["MPNS 8021","HMC 9021"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Serviço no sistema de combustível da máquina."},
  {"nome":"EXEC TERCEIROS TRABALHANDO","codigos":["MPS 7015","MPNS 8015","HMC 9015"],"sit":"EXEC","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Empresa contratada fazendo o serviço."},
  {"nome":"AG ABASTECIMENTO","codigos":["MPS 7129"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Comboio de diesel","expurgo":"Depende do dono do comboio","ex":"Durante a manutenção, precisa completar diesel."},
  {"nome":"AG LAVADOR","codigos":["MPS 7111","MPNS 8111","HMC 9111"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Lavador","expurgo":"Depende do dono do recurso","ex":"Aguardando lavador."},
  {"nome":"AG TELECOM/REDES TELECOM","codigos":["MPS 7136","MPNS 8136","HMC 9136"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono de Rádio / telecom","expurgo":"Depende do dono do recurso","ex":"Aguardando técnico de telecom."},
  {"nome":"AG APROVACAO","codigos":["MPS 7107","MPNS 8107","HMC 9107"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando aprovação de compra de material/serviço."},
  {"nome":"AG CALDERARIA/SOLDA","codigos":["MPS 7124","MPNS 8124","HMC 9124"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando soldador."},
  {"nome":"AG SISTEMAS SEGURANCA","codigos":["MPS 7137","MPNS 8137","HMC 9137"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando instalação/manutenção do dispositivo de segurança."},
  {"nome":"AG ELETRONICA/AUTOMACAO","codigos":["MPS 7103","MPNS 8103","HMC 9103"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando técnico de eletrônica."},
  {"nome":"AG ELETRICA","codigos":["MPS 7102","MPNS 8102","HMC 9102"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando eletricista."},
  {"nome":"AG GARANTIA / ASSIST TECNICA","codigos":["MPS 7123","MPNS 8123","HMC 9123"],"sit":"AG","resp":"A_DEFINIR","quem":"Fornecedor","expurgo":"A validar com a Vale","ex":"Aguardando garantia/assistência."},
  {"nome":"AG MECANICA","codigos":["MPS 7101","MPNS 8101","HMC 9101"],"sit":"AG","resp":"MANUTENCAO","quem":"Manutenção","expurgo":"NÃO","ex":"Aguardando mecânico."},
  {"nome":"AG OFICINA DE COMPONENTES","codigos":["MPS 7128","MPNS 8128","HMC 9128"],"sit":"AG","resp":"MANUTENCAO","quem":"Dono de Almoxarifado / suprimentos (peças)","expurgo":"NÃO","ex":"Aguardando componente em reforma na oficina de componentes."},
  {"nome":"LIBERADO PELA MANUT","codigos":["HOI 5936"],"sit":"AG","resp":"PRODUCAO","quem":"Supervisor de Produção (operador assumir)","expurgo":"Não se aplica","ex":"Manutenção terminou; máquina aguardando o operador assumir."},
  {"nome":"FALTA EQUIP DE CARGA","codigos":["HOI 5929"],"sit":"AG","resp":"PRODUCAO","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Caminhão bom parado porque a escavadeira quebrou."},
  {"nome":"AG EQUIPAMENTO CARGA","codigos":["HOI 5907"],"sit":"AG","resp":"PRODUCAO","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Caminhão aguardando a escavadeira iniciar/retornar."},
  {"nome":"PARADO POR TKPH","codigos":["HOI 5941"],"sit":"AG","resp":"PRODUCAO","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Pneu quente / TKPH alto, sem dano."},
  {"nome":"INSPECAO OPERA/LIMPEZA","codigos":["HOI 5934"],"sit":"AG","resp":"PRODUCAO","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Inspeção/limpeza feita pelo operador."},
  {"nome":"AG ENTREGA P/ MANUT (validar)","codigos":["HOI 5906"],"sit":"AG","resp":"PRODUCAO","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Produção ainda não entregou a máquina para a manutenção."},
  {"nome":"AG FISCALIZACAO (validar)","codigos":["HOI 5753"],"sit":"AG","resp":"VALE","quem":"Supervisor de Produção (registrar quem da Vale determinou)","expurgo":"Não se aplica","ex":"Parada determinada pela fiscalização da Vale."},
  {"nome":"EQPTO INTERDITADO (a decidir)","codigos":["HOI 5762"],"sit":"AG","resp":"A_DEFINIR","quem":"Gestão U&M + Segurança","expurgo":"A decidir (D-04)","ex":"Equipamento interditado (ex.: interdição pela Vale)."},
  {"nome":"AG GEOTECNIA","codigos":["HOI 5949"],"sit":"AG","resp":"A_DEFINIR","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Aguardando liberação da geotecnia."},
  {"nome":"AG EMBARCACAO EM CARRETA","codigos":["HOI 5983"],"sit":"AG","resp":"A_DEFINIR","quem":"Dono da prancha","expurgo":"Não se aplica","ex":"Aguardando embarque na prancha (TAG da prancha no complemento)."},
  {"nome":"AG DETON ATRASO MANUT","codigos":["HOI 5937"],"sit":"AG","resp":"A_DEFINIR","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Máquinas esperando o fogo atrasado por quebra no cerco."},
  {"nome":"OMISSAO DO OPERADOR (temporário)","codigos":["HAO 2912"],"sit":"AG","resp":"PRODUCAO","quem":"Supervisor de Produção","expurgo":"Não se aplica","ex":"Máquina parada sem aviso ao despacho."},
  {"nome":"TEMPORARIO - DECISAO CONJUNTA","codigos":["9999"],"sit":"AG","resp":"A_DEFINIR","quem":"Supervisores de Produção e Manutenção juntos","expurgo":"Depende da decisão no turno","ex":"Sem consenso: lançar 9999 e ligar para os dois supervisores."}
];

// Gera a lista plana para busca direta por código
export const CODIGOS_VALE_FLAT: CodigoValeFlat[] = [];

CODIGOS_VALE.forEach((item) => {
  const aValidar = item.nome.includes('(validar)') || item.nome.includes('(a decidir)') || item.nome.includes('(temporário)');
  const nomeLimpo = item.nome.replace(/\s*\((?:validar|a decidir|temporário)\)/gi, '').trim();

  item.codigos.forEach((cod) => {
    const parts = cod.trim().split(/\s+/);
    const prefixo = parts.length > 1 ? parts[0] : (cod.startsWith('9999') ? 'ESPECIAL' : 'VALE');
    const numero = parts.length > 1 ? parts[1] : cod;
    
    CODIGOS_VALE_FLAT.push({
      codigo: cod,
      nome: nomeLimpo,
      rotuloCompleto: `${cod} – ${nomeLimpo}`,
      prefixo,
      numero,
      sit: item.sit,
      resp: item.resp,
      quem: item.quem,
      expurgo: item.expurgo,
      ex: item.ex,
      aValidar
    });
  });
});

/**
 * Encontra a definição de um código Vale
 */
export function buscarCodigoVale(codigoStr: string): CodigoValeFlat | undefined {
  if (!codigoStr) return undefined;
  const clean = codigoStr.trim().toUpperCase();
  return CODIGOS_VALE_FLAT.find(c => c.codigo.toUpperCase() === clean || c.rotuloCompleto.toUpperCase() === clean);
}

/**
 * Função sugerida para o responsável com base no código e na classe
 */
export function getFuncaoResponsavelSugerida(codigo: string, resp: string, quem: string): string {
  if (quem && quem !== 'Manutenção' && quem !== 'Externo') return quem;
  switch (resp) {
    case 'PRODUCAO':
      return 'Supervisor de Produção do turno';
    case 'VALE':
      return 'Fiscalização da Vale';
    case 'MANUTENCAO':
      return 'Supervisor de Manutenção do turno';
    case 'EXTERNO':
      return 'Concessionária / Terceiro externo';
    case 'ACIDENTE':
      return 'Comissão de apuração do acidente';
    case 'A_DEFINIR':
    default:
      return 'A definir com a Supervisão';
  }
}
