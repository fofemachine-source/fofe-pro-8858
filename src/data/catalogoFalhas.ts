import * as XLSX from 'xlsx';

export type Sintoma = {
  codigo: string;
  nome: string;
};

export type Componente = {
  codigo: string;
  nome: string;
  sintomas: Sintoma[];
};

export type Sistema = {
  codigo: string;
  nome: string;
  componentes: Componente[];
};

export interface FalhaCatalogada {
  perfil: string;
  sistema: { codigo: string; nome: string };
  componente: { codigo: string; nome: string };
  sintoma: { codigo: string; nome: string };
  complemento?: string;
  codigoCompleto: string; // Formato "PERFIL/SISTEMA/COMPONENTE/SINTOMA", ex.: "EH/HD/CV/1"
}

export type CatalogoCompacto = Record<string, [string, string, [string, string, [string, string][]][]][]>;

export const CATALOGO_FALHAS: Record<string, [string, string, [string, string, [string, string][]][]][]> = {
  "CRMEC": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["CF","Comando Final",[["CF","Comando Final",[["29","Filtro saturado"],["58","Alojamentos de roda danificado"],["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["CVT","Conversor de torque",[["CVT","Conversor de torque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["DF","Diferencial",[["DF","Diferencial",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["DR","Direção",[["AC","Acumulador",[["87","Vazamento"]]],["CLD","CL de direção",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"],["156","Calibração"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]],["OR","Orbitrol",[["1","Falha de funcionalidade"],["87","Vazamento"]]],["T/BD","Tirantes/Braços de direção",[["22","Folga"],["46","Quebra"]]],["CRD","Cardan",[["32","Danificado(a)"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","NA"]]],["AS","Alarmes sonoros",[["144","NA"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ESCR","Estrutura CR",[["BS","Báscula",[["24","Pino/Parafuso danificado"],["151","Trinca"]]],["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["ES","Escada",[["33","Deformação"],["151","Trinca"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["HDCR","Hidráulico CR",[["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["CLB","Cl báscula",[["0","Bucha/Olhal danificado"],["28","Revestimento danificado"],["87","Vazamento"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MM","Mangueira/Mangote",[["32","Danificado(a)"],["87","Vazamento"]]],["OL","Óleo / Fluído",[["14","Superaquecimento"],["141","SOS Crítico"],["142","SOS Monitorar"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["SP","Suspensão",[["DD","Dianteira",[["0","Bucha/Olhal danificado"],["32","Danificado(a)"],["46","Quebra"],["87","Vazamento"],["132","Calibração"]]],["TA","Traseira",[["0","Bucha/Olhal danificado"],["32","Danificado(a)"],["46","Quebra"],["87","Vazamento"],["132","Calibração"]]]]],
    ["TR","Transmissão",[["TN","Tandem",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["TR","Transmissão",[["14","Superaquecimento"],["29","Filtro Saturado"],["34","Bomba danificada"],["45","Não engrenar"],["87","Vazamento"],["129","Pressão desregulada"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["CR","Cubo de Roda",[["CR","Cubo de Roda",[["32","Danificado(a)"],["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]]
  ],
  "CREL": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AL","Alternador",[["AL","Alternador",[["12","Desgaste de escovas"],["17","Flash"],["35","Isolamento"],["67","Barulho/Vibração anormal"],["106","Correia Danificada"],["133","Folga nas conexões"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["DR","Direção",[["AC","Acumulador",[["87","Vazamento"]]],["CLD","CL de direção",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"],["156","Calibração"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]],["OR","Orbitrol",[["1","Falha de funcionalidade"],["87","Vazamento"]]],["T/BD","Tirantes/Braços de direção",[["22","Folga"],["46","Quebra"]]],["CRD","Cardan",[["32","Danificado(a)"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ESCR","Estrutura CR",[["BS","Báscula",[["24","Pino/Parafuso danificado"],["151","Trinca"]]],["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["ES","Escada",[["33","Deformação"],["151","Trinca"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["HDCR","Hidráulico CR",[["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["CLB","Cl báscula",[["0","Bucha/Olhal danificado"],["28","Revestimento danificado"],["87","Vazamento"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MM","Mangueira/Mangote",[["32","Danificado(a)"],["87","Vazamento"]]],["OL","Óleo / Fluído",[["14","Superaquecimento"],["141","SOS Crítico"],["142","SOS Monitorar"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["RM","Roda Motorizada",[["RM","Roda Motorizada",[["7","Desgaste"],["12","Desgaste de escovas"],["19","Limpeza motor elétrico"],["37","Baixo isolamento"],["62","Porta escova travado"],["63","Vazamento Hidráulico"],["65","Controle de temperatura"],["67","Barulho/Vibração anormal"],["74","Folga nas conexões elétricas"],["87","Vazamento"],["91","Trinca"],["96","Curto circuito"],["134","Pinhão Solar"],["141","SOS Crítico"],["142","SOS Monitorar"],["158","Perda de Propulsão"]]]]],
    ["SP","Suspensão",[["DD","Dianteira",[["0","Bucha/Olhal danificado"],["32","Danificado(a)"],["46","Quebra"],["87","Vazamento"],["132","Calibração"]]],["TA","Traseira",[["0","Bucha/Olhal danificado"],["32","Danificado(a)"],["46","Quebra"],["87","Vazamento"],["132","Calibração"]]]]],
    ["CR","Cubo de Roda",[["CR","Cubo de Roda",[["32","Danificado(a)"],["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]]
  ],
  "EH": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["CF","Comando Final",[["CF","Comando Final",[["29","Filtro saturado"],["58","Alojamentos de roda danificado"],["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","NA"]]],["AS","Alarmes sonoros",[["144","NA"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ES","Estrutura EH",[["CI","Carro inferior",[["72","Pino/Bucha danificado"],["91","Trinca"]]],["CUP","Carro superior",[["72","Pino/Bucha danificado"],["151","Trinca"]]],["RLG","Rolamento de Giro",[["67","Barulho/Vibração anormal"],["91","Trinca"],["143","Contaminação"]]],["GI","Coroa de Giro",[["67","Barulho/Vibração anormal"],["91","Trinca"],["143","Contaminação"]]],["RDG","Redutor de Giro",[["32","Danificado(a)"],["87","Vazamento"],["143","Contaminação"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["HD","Hidráulico EH",[["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["MM","Mangueira/Mangote",[["32","Danificado(a)"],["87","Vazamento"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["CV","Comando de Válvulas",[["1","Falha de funcionalidade"],["155","Vazamento"],["156","Barulho/Vibração anormal"]]],["CL","Cilindro",[["82","Sangria Danificada"],["87","Vazamento"],["89","Fuga interna"],["97","Camisa/Haste riscada"],["154","Curso Limitado"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["MH","Motor Hidráulico",[["87","Vazamento"],["109","Baixa potência/ Shutdown"]]],["R/D","Registro/ Dreno",[["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["SW","Swivel",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["IPEH","Implemento EH",[["FPS","FPS",[["7","Desgaste"],["36","Pino/Trava"],["54","Unha/Adaptador"],["71","Desgaste de material de reforço"],["91","Trinca"]]],["BR","Braço",[["24","Pino/Bucha"],["151","Trinca"]]],["SB","Semi-braço",[["24","Pino/Bucha"],["91","Trinca"]]],["CO","Concha",[["7","Desgaste"],["91","Trinca"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["MR","Material Rodante",[["S/P","Esteira/Sapata/Pino",[["7","Desgaste"],["46","Quebra"],["91","Trinca"]]],["RT","Rolete",[["7","Desgaste"],["91","Trinca"]]],["RG","Roda guia",[["32","Danificado(a)"],["87","Vazamento"]]],["RMOT","Roda motriz",[["7","Desgaste"],["87","Vazamento"],["91","Trinca"]]],["C/S","Corrente/Segmento",[["7","Desgaste"],["46","Quebra"],["151","Trinca"]]]]]
  ],
  "MN": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["DF","Diferencial",[["DF","Diferencial",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["DR","Direção",[["AC","Acumulador",[["87","Vazamento"]]],["CLD","CL de direção",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"],["156","Calibração"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]],["OR","Orbitrol",[["1","Falha de funcionalidade"],["87","Vazamento"]]],["T/BD","Tirantes/Braços de direção",[["22","Folga"],["46","Quebra"]]],["CRD","Cardan",[["32","Danificado(a)"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","NA"]]],["AS","Alarmes sonoros",[["144","NA"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ESMN","Estrutura MN",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["GM","Mesa de giro",[["7","Desgaste"],["91","Trinca"],["110","Pafusos danificados"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["HDMN","Hidráulico MN",[["CLLI","CL lâmina inclinação",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLLE","CL lâmina elevação",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLF","CL escarificador",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MH","Motor hidráulico",[["87","Vazamento"],["109","Baixa potência/ Shutdown"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["IPMN","Implemento MN",[["LM","Lâmina",[["32","Danificado(a)"]]],["EF","Escarificador",[["32","Danificado(a)"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["TN","Tandem",[["TN","Tandem",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]]]],
    ["TR","Transmissão",[["TR","Transmissão",[["14","Superaquecimento"],["29","Filtro Saturado"],["34","Bomba danificada"],["45","Não engrenar"],["87","Vazamento"],["129","Pressão desregulada"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]]
  ],
  "PM-RC": [
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["ESGR","Estrutura Geral",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["TR","Transmissão",[["TN","Tandem",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["TR","Transmissão",[["14","Superaquecimento"],["29","Filtro Saturado"],["34","Bomba danificada"],["45","Não engrenar"],["87","Vazamento"],["129","Pressão desregulada"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["DF","Diferencial",[["DF","Diferencial",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["CVT","Conversor de torque",[["CVT","Conversor de torque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["DR","Direção",[["AC","Acumulador",[["87","Vazamento"]]],["CLD","CL de direção",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"],["156","Calibração"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]],["OR","Orbitrol",[["1","Falha de funcionalidade"],["87","Vazamento"]]],["T/BD","Tirantes/Braços de direção",[["22","Folga"],["46","Quebra"]]],["CRD","Cardan",[["32","Danificado(a)"]]]]],
    ["HDGR","Hidráulico Geral",[["CL","Cilindro",[["82","Sangria Danificada"],["87","Vazamento"],["89","Fuga interna"],["97","Camisa/Haste riscada"],["154","Curso Limitado"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MH","Motor hidráulico",[["87","Vazamento"],["109","Baixa potência/ Shutdown"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["IPPMRC","Implemento PM e RC",[["PA","Pá",[["144","NA"]]],["BO","Borda",[["144","NA"]]],["CLLE","Cl de elevação",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["PT","Ponta",[["144","NA"]]],["RR","Rolo",[["32","Danificado(a)"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]]
  ],
  "TE": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["CVT","Conversor de torque",[["CVT","Conversor de torque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["DF","Diferencial",[["DF","Diferencial",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ESTE","Estrutura TE",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["BE","Barra estabilizadora",[["32","Danificado(a)"],["123","Bucha danificada"],["151","Trinca"]]],["ST","Suportes",[["32","Danificado(a)"]]],["TK","Truck",[["32","Danificado(a)"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["HDTE","Hidráulico TE",[["CLLI","CL lâmina inclinação",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLLE","CL lâmina elevação",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLR","CL ripper",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MH","Motor hidráulico",[["87","Vazamento"],["109","Baixa potência/ Shutdown"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["IPTE","Implemento TE",[["LM","Lâmina",[["32","Danificado(a)"]]],["EF","Escarificador",[["32","Danificado(a)"]]],["BC","Bordas cortantes",[["7","Desgaste"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["MR","Material Rodante",[["S/P","Esteira/Sapata/Pino",[["7","Desgaste"],["46","Quebra"],["91","Trinca"]]],["RT","Rolete",[["7","Desgaste"],["91","Trinca"]]],["RG","Roda guia",[["32","Danificado(a)"],["87","Vazamento"]]],["RMOT","Roda motriz",[["7","Desgaste"],["87","Vazamento"],["91","Trinca"]]],["C/S","Corrente/Segmento",[["7","Desgaste"],["46","Quebra"],["151","Trinca"]]]]],
    ["TR","Transmissão",[["TN","Tandem",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["TR","Transmissão",[["14","Superaquecimento"],["29","Filtro Saturado"],["34","Bomba danificada"],["45","Não engrenar"],["87","Vazamento"],["129","Pressão desregulada"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]]
  ],
  "CA": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["CF","Comando Final",[["CF","Comando Final",[["29","Filtro saturado"],["58","Alojamentos de roda danificado"],["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["CVT","Conversor de torque",[["CVT","Conversor de torque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["DF","Diferencial",[["DF","Diferencial",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["DR","Direção",[["AC","Acumulador",[["87","Vazamento"]]],["CLD","CL de direção",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"],["156","Calibração"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]],["OR","Orbitrol",[["1","Falha de funcionalidade"],["87","Vazamento"]]],["T/BD","Tirantes/Braços de direção",[["22","Folga"],["46","Quebra"]]],["CRD","Cardan",[["32","Danificado(a)"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ESCA","Estrutura CA",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["AR","Articulação",[["151","Trinca"],["152","Quebra"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["HDGR","Hidráulico Geral",[["CL","Cilindro",[["82","Sangria Danificada"],["87","Vazamento"],["89","Fuga interna"],["97","Camisa/Haste riscada"],["154","Curso Limitado"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MH","Motor hidráulico",[["87","Vazamento"],["109","Baixa potência/ Shutdown"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["SPCA","Suspensão CA",[["SN","Suspensão normal",[["30","Cilindro com vazamento"],["70","Bucha/Rótula"],["132","Calibração"]]],["SC","Suspensão central",[["30","Cilindro com vazamento"],["70","Bucha/Rótula"],["132","Calibração"]]],["SD","Suspensão Dianteira",[["30","Cilindro com vazamento"],["70","Bucha/Rótula"],["132","Calibração"]]],["STE","Suspensão traseira equalizadora",[["30","Cilindro com vazamento"],["70","Bucha/Rótula"],["132","Calibração"]]]]],
    ["TR","Transmissão",[["TN","Tandem",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["TR","Transmissão",[["14","Superaquecimento"],["29","Filtro Saturado"],["34","Bomba danificada"],["45","Não engrenar"],["87","Vazamento"],["129","Pressão desregulada"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]]
  ],
  "CD-CL-CO-CP-CG": [
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["ESGR","Estrutura Geral",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["TR","Transmissão",[["TN","Tandem",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["TR","Transmissão",[["14","Superaquecimento"],["29","Filtro Saturado"],["34","Bomba danificada"],["45","Não engrenar"],["87","Vazamento"],["129","Pressão desregulada"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["SPRO","Suspensão Rodoviários",[["SPRO","Suspensão Rodoviários",[["4","Ajuste"],["90","Mola trapezoidal danificada"],["103","Mola parabólica danificada"],["105","Amortecimento danificado"],["157","Falha dos parafusos"]]]]],
    ["DRGR","Direção Geral",[["DRGR","Direção Geral",[["20","Barra de direção danificada"],["31","Setor de direção danificado"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["IPROD","Implemento Rodoviários",[["BS","Báscula",[["24","Pino/Parafuso danificado"],["151","Trinca"]]],["CLLE","CL de elevação",[["0","Bucha/Olhal danificado"],["46","Quebra"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["MM","Mangueira/Mangote",[["32","Danificado(a)"],["87","Vazamento"]]],["CT","Carretel",[["32","Danificado(a)"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["BI","Bico",[["32","Danificado(a)"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["CP","Compressor",[["144","NA"]]],["MS","Máquina de solda",[["144","NA"]]],["MK","Munck",[["144","NA"]]],["RS","Registro",[["32","Danificado(a)"]]],["GU","Guincho",[["32","Danificado(a)"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]]
  ],
  "EP-TH-PL": [
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["ESGR","Estrutura Geral",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["TR","Transmissão",[["TN","Tandem",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["TR","Transmissão",[["14","Superaquecimento"],["29","Filtro Saturado"],["34","Bomba danificada"],["45","Não engrenar"],["87","Vazamento"],["129","Pressão desregulada"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["DRGR","Direção Geral",[["DRGR","Direção Geral",[["20","Barra de direção danificada"],["31","Setor de direção danificado"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["IPEP","Implemento EP-TH",[["GF","Garfo",[["32","Danificado(a)"]]],["TRR","Torre",[["32","Danificado(a)"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["HDGR","Hidráulico Geral",[["CL","Cilindro",[["82","Sangria Danificada"],["87","Vazamento"],["89","Fuga interna"],["97","Camisa/Haste riscada"],["154","Curso Limitado"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MH","Motor hidráulico",[["87","Vazamento"],["109","Baixa potência/ Shutdown"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]]
  ],
  "PF": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["CF","Comando Final",[["CF","Comando Final",[["29","Filtro saturado"],["58","Alojamentos de roda danificado"],["67","Barulho/Vibração anormal"],["87","Vazamento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ESPF","Estrutura PF",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["TF","Torre de perfuração",[["32","Danificado(a)"],["91","Trinca"]]],["ST","Suportes",[["32","Danificado(a)"]]],["MT","Martelo",[["32","Danificado(a)"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["HDPF","Hidráulico PF",[["CLET","CL de elevação da torre",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLFT","Cl de fixação da torre",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLA","CL de avanço",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLOC","CL de oscilação de carrossel",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLIC","CL de indexação de carrossel",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLC","CL da chave de corrente",[["46","Quebra"],["87","Vazamento"],["0","Bucha/Olhal danificado"]]],["CLP","CL da cobertura anti-poeira",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["CLSV","CL de suporte de varas",[["0","Bucha/Olhal danificado"],["46","Quebra"],["87","Vazamento"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["VL","Válvulas",[["66","Fuga"],["87","Vazamento"],["144","NA"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["MH","Motor hidráulico",[["87","Vazamento"],["109","Baixa potência/ Shutdown"]]],["OL","Óleo / Fluído",[["14","Superaquecimento"],["141","SOS Crítico"],["142","SOS Monitorar"]]]]],
    ["IPPF","Implemento PF",[["BIT","BIT",[["32","Danificado(a)"],["151","Trinca"]]],["HT","Haste",[["7","Desgaste"],["32","Danificado(a)"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["MR","Material Rodante",[["S/P","Esteira/Sapata/Pino",[["7","Desgaste"],["46","Quebra"],["91","Trinca"]]],["RT","Rolete",[["7","Desgaste"],["91","Trinca"]]],["RG","Roda guia",[["32","Danificado(a)"],["87","Vazamento"]]],["RMOT","Roda motriz",[["7","Desgaste"],["87","Vazamento"],["91","Trinca"]]],["C/S","Corrente/Segmento",[["7","Desgaste"],["46","Quebra"],["151","Trinca"]]]]]
  ]
};

/**
 * Mantém o nome do sintoma exatamente como na planilha (ex.: "NA", "Obstrução", "Danificado(a)").
 * Não acrescenta "– Não se aplica" ao "NA".
 */
export function formatarNomeSintomaExibicao(nome: string): string {
  if (!nome) return '';
  return nome;
}

/**
 * Conferência obrigatória (Parte 2):
 * Compara sistemas, componentes e códigos de cada perfil de CATALOGO_FALHAS
 * e mostra erro no console se não bater exatamente.
 */
export const CONTAGEM_ESPERADA_CATALOGO: Record<string, { sistemas: number; componentes: number; codigos: number }> = {
  'CRMEC': { sistemas: 18, componentes: 72, codigos: 192 },
  'CREL': { sistemas: 16, componentes: 69, codigos: 189 },
  'EH': { sistemas: 12, componentes: 70, codigos: 160 },
  'MN': { sistemas: 16, componentes: 70, codigos: 174 },
  'PM-RC': { sistemas: 16, componentes: 71, codigos: 176 },
  'TE': { sistemas: 14, componentes: 67, codigos: 156 },
  'CA': { sistemas: 17, componentes: 72, codigos: 189 },
  'CD-CL-CO-CP-CG': { sistemas: 14, componentes: 65, codigos: 154 },
  'EP-TH-PL': { sistemas: 13, componentes: 55, codigos: 138 },
  'PF': { sistemas: 12, componentes: 66, codigos: 154 }
};

export function conferirCatalogoOficial(): boolean {
  let tudoOk = true;
  for (const [perfil, esperado] of Object.entries(CONTAGEM_ESPERADA_CATALOGO)) {
    const sistemasArr = CATALOGO_FALHAS[perfil];
    if (!sistemasArr) {
      console.error(`[CATÁLOGO ERRO] Perfil "${perfil}" ausente em CATALOGO_FALHAS!`);
      tudoOk = false;
      continue;
    }
    const numSistemas = sistemasArr.length;
    let numComponentes = 0;
    let numCodigos = 0;
    for (const [, , comps] of sistemasArr) {
      numComponentes += comps.length;
      for (const [, , sints] of comps) {
        numCodigos += sints.length;
      }
    }
    if (
      numSistemas !== esperado.sistemas ||
      numComponentes !== esperado.componentes ||
      numCodigos !== esperado.codigos
    ) {
      console.error(
        `[CATÁLOGO ERRO] Perfil ${perfil} divergente! Esperado: ${esperado.sistemas} sistemas, ${esperado.componentes} componentes, ${esperado.codigos} códigos. Encontrado: ${numSistemas} sistemas, ${numComponentes} componentes, ${numCodigos} códigos.`
      );
      tudoOk = false;
    }
  }
  if (CATALOGO_FALHAS['CB']) {
    console.error('[CATÁLOGO ERRO] O perfil "CB" ainda existe em CATALOGO_FALHAS, mas deveria ter sido removido!');
    tudoOk = false;
  }
  if (tudoOk) {
    console.log('[CATÁLOGO OK] Conferência obrigatória dos 10 perfis de CATALOGO_FALHAS aprovada sem erros.');
  }
  return tudoOk;
}

/**
 * Regra 2.2: Se existir catálogo salvo anteriormente no navegador, apaga para o app usar este arquivo exato.
 */
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('fofe_catalogo_falhas_custom_v1');
    localStorage.removeItem('rft_catalogo_falhas_custom');
  } catch (e) {}
}

// Executa o teste automático imediatamente ao carregar o módulo
conferirCatalogoOficial();

/**
 * Mapeamento de frotas CR (Parte 1.2 e Parte 3.1):
 * - CR-25xx -> "CRMEC" (Komatsu HD785, transmissão mecânica)
 * - CR-30xx, CR-31xx, CR-35xx -> "CREL" (Komatsu 730E, acionamento elétrico)
 */
export const MAPA_FROTA_CR: {
  CRMEC: string[];
  CREL: string[];
} = {
  CRMEC: ['25'],
  CREL: ['30', '31', '35']
};

export const DESCRICAO_PERFIS: Record<string, string> = {
  'CRMEC': 'CR Mecânico (HD785)',
  'CREL': 'CR Elétrico (730E)',
  'EH': 'Escavadeiras',
  'MN': 'Motoniveladoras',
  'PM-RC': 'Pás Carregadeiras / Rolos',
  'TE': 'Tratores de Esteira',
  'CA': 'Caminhões Articulados',
  'CD-CL-CO-CP-CG': 'Rodoviários / Apoio',
  'EP-TH-PL': 'Empilhadeiras / Manipuladores',
  'PF': 'Perfuratrizes'
};

export interface CatalogoCustomizadoSalvo {
  catalogo: CatalogoCompacto;
  atualizadoEm: string;
  atualizadoPor: string;
  nomeArquivo?: string;
}

export function carregarCatalogoCustomizadoLocal(): CatalogoCustomizadoSalvo | null {
  return null;
}

export function definirCatalogoCustomizado(_dados: CatalogoCustomizadoSalvo | null): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('fofe_catalogo_falhas_custom_v1');
      localStorage.removeItem('rft_catalogo_falhas_custom');
    } catch (e) {}
  }
}

export function obterFonteCatalogoAtiva(): CatalogoCompacto {
  return CATALOGO_FALHAS;
}

/**
 * Converte o formato compacto do perfil para lista de objetos Sistema[]
 * Sempre usa SOMENTE CATALOGO_FALHAS[perfil], mantendo a mesma ordem da planilha
 * e exibindo o sintoma "NA" como "NA – Não se aplica" (Regra 2.4).
 */
export function getCatalogo(perfil: string): Sistema[] {
  if (!perfil) return [];
  const key = perfil.trim().toUpperCase();
  if (key === 'CB') return [];
  const sistemasRaw = CATALOGO_FALHAS[key];
  if (!sistemasRaw) return [];

  return sistemasRaw.map(([codSis, nomeSis, componentesRaw]) => ({
    codigo: codSis,
    nome: nomeSis,
    componentes: (componentesRaw || []).map(([codComp, nomeComp, sintomasRaw]) => ({
      codigo: codComp,
      nome: nomeComp,
      sintomas: (sintomasRaw || []).map(([codSint, nomeSint]) => ({
        codigo: codSint,
        nome: formatarNomeSintomaExibicao(nomeSint)
      }))
    }))
  }));
}

/**
 * Lista todos os perfis disponíveis no catálogo oficial (sem CB)
 */
export function listarPerfis(): string[] {
  return Object.keys(CATALOGO_FALHAS);
}

function removerAcentos(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca sem acento e sem diferenciar maiúsculas, por código ou nome de sistema, componente ou sintoma,
 * usando estritamente o perfil informado.
 */
export function buscarNoCatalogo(
  perfil: string,
  texto: string
): { sistema: { codigo: string; nome: string }; componente: { codigo: string; nome: string }; sintoma: { codigo: string; nome: string } }[] {
  const termo = removerAcentos(texto);
  if (!termo) return [];

  const sistemas = getCatalogo(perfil);
  const resultados: {
    sistema: { codigo: string; nome: string };
    componente: { codigo: string; nome: string };
    sintoma: { codigo: string; nome: string };
  }[] = [];

  const termos = termo.split(/\s+/).filter(Boolean);

  for (const sis of sistemas) {
    const sisTexto = removerAcentos(`${sis.codigo} ${sis.nome}`);
    for (const comp of sis.componentes) {
      const compTexto = removerAcentos(`${comp.codigo} ${comp.nome}`);
      for (const sint of comp.sintomas) {
        const sintTexto = removerAcentos(`${sint.codigo} ${sint.nome}`);
        const combinado = `${sisTexto} ${compTexto} ${sintTexto}`;
        const bateTodos = termos.every(t => combinado.includes(t));
        if (bateTodos) {
          resultados.push({
            sistema: { codigo: sis.codigo, nome: sis.nome },
            componente: { codigo: comp.codigo, nome: comp.nome },
            sintoma: { codigo: sint.codigo, nome: sint.nome }
          });
        }
      }
    }
  }

  return resultados;
}

/**
 * Normaliza TAG no formato PREFIXO-NÚMERO (ex.: "CR3114" -> "CR-3114") e separa prefixo e número.
 */
export function normalizarESepararTag(raw: string): {
  tagNormalizada: string;
  prefixo: string;
  numero: string;
} {
  if (!raw) return { tagNormalizada: '', prefixo: '', numero: '' };
  const upper = raw.toUpperCase().trim();
  const compact = upper.replace(/[\s\-_]+/g, '');
  const match = compact.match(/^([A-Z]+)(\d+[A-Z0-9]*)$/);
  if (match) {
    const prefixo = match[1];
    const numero = match[2];
    return {
      tagNormalizada: `${prefixo}-${numero}`,
      prefixo,
      numero
    };
  }
  const parts = upper.split(/[\s\-_]+/).filter(Boolean);
  const prefixoMatch = upper.match(/^([A-Z]+)/);
  const numeroMatch = upper.match(/(\d+)/);
  return {
    tagNormalizada: parts.length >= 2 ? `${parts[0]}-${parts.slice(1).join('-')}` : upper,
    prefixo: prefixoMatch ? prefixoMatch[1] : '',
    numero: numeroMatch ? numeroMatch[1] : ''
  };
}

/**
 * Verifica se a TAG é de um caminhão CR cujo número não se encaixa automaticamente em CRMEC ou CREL
 */
export function precisaEscolherPerfilCR(tag: string): boolean {
  const { prefixo, numero } = normalizarESepararTag(tag);
  if (prefixo !== 'CR') return false;
  if (!numero) return true;
  const ehMec = MAPA_FROTA_CR.CRMEC.some(p => numero.startsWith(p));
  const ehEl = MAPA_FROTA_CR.CREL.some(p => numero.startsWith(p));
  return !ehMec && !ehEl;
}

/**
 * Parte 3.1 – perfilDaTag(tag):
 * - EH → "EH"
 * - CR-25xx → "CRMEC" (HD785, transmissão mecânica)
 * - CR-30xx, CR-31xx, CR-35xx → "CREL" (730E, acionamento elétrico)
 * - MN → "MN"; PF → "PF"; PM/RC → "PM-RC"; TE → "TE"; CA → "CA";
 *   CD/CL/CO/CP/CG → "CD-CL-CO-CP-CG"; EP/TH/PL → "EP-TH-PL"
 * - CB → null (sem catálogo; CB não faz parte da frota)
 * - Outros → null (sem catálogo; texto livre)
 */
export function perfilDaTag(tag: string): string | null {
  const { prefixo, numero } = normalizarESepararTag(tag);
  if (!prefixo) return null;

  switch (prefixo) {
    case 'EH':
      return 'EH';
    case 'CR': {
      if (!numero) return null;
      if (MAPA_FROTA_CR.CRMEC.some(p => numero.startsWith(p))) return 'CRMEC';
      if (MAPA_FROTA_CR.CREL.some(p => numero.startsWith(p))) return 'CREL';
      return null;
    }
    case 'MN':
      return 'MN';
    case 'PF':
      return 'PF';
    case 'PM':
    case 'RC':
      return 'PM-RC';
    case 'TE':
      return 'TE';
    case 'CA':
      return 'CA';
    case 'CD':
    case 'CL':
    case 'CO':
    case 'CP':
    case 'CG':
      return 'CD-CL-CO-CP-CG';
    case 'EP':
    case 'TH':
    case 'PL':
      return 'EP-TH-PL';
    case 'CB':
      return null;
    default:
      return null;
  }
}

/**
 * Formata a exibição resumida para Card da Parada e Dashboard:
 * Ex.: "HD › Comando de Válvulas › Falha de funcionalidade"
 */
export function formatarFalhaCard(falha?: FalhaCatalogada | null, textoLegado?: string | null): string {
  if (falha && falha.sistema?.codigo && falha.componente?.nome && falha.sintoma?.nome) {
    const sintNome = formatarNomeSintomaExibicao(falha.sintoma.nome);
    const base = `${falha.sistema.codigo} › ${falha.componente.nome} › ${sintNome}`;
    return falha.complemento?.trim() ? `${base} (${falha.complemento.trim()})` : base;
  }
  return textoLegado?.trim() || '';
}

/**
 * Formata a exibição completa para Histórico e Detalhe do Relatório
 */
export function formatarFalhaDetalhe(falha?: FalhaCatalogada | null, textoLegado?: string | null): string {
  if (falha && falha.codigoCompleto) {
    const sintNome = formatarNomeSintomaExibicao(falha.sintoma.nome);
    const nomes = `${falha.sistema.codigo} – ${falha.sistema.nome} › ${falha.componente.codigo} – ${falha.componente.nome} › ${falha.sintoma.codigo} – ${sintNome}`;
    const comp = falha.complemento?.trim() ? ` | Compl.: ${falha.complemento.trim()}` : '';
    return `[${falha.codigoCompleto}] ${nomes}${comp}`;
  }
  return textoLegado?.trim() || '';
}

/**
 * Constrói um objeto FalhaCatalogada completo
 */
export function construirFalhaCatalogada(params: {
  perfil: string;
  sistema: { codigo: string; nome: string };
  componente: { codigo: string; nome: string };
  sintoma: { codigo: string; nome: string };
  complemento?: string;
}): FalhaCatalogada {
  const codigoCompleto = `${params.perfil}/${params.sistema.codigo}/${params.componente.codigo}/${params.sintoma.codigo}`;
  return {
    perfil: params.perfil,
    sistema: { codigo: params.sistema.codigo, nome: params.sistema.nome },
    componente: { codigo: params.componente.codigo, nome: params.componente.nome },
    sintoma: {
      codigo: params.sintoma.codigo,
      nome: formatarNomeSintomaExibicao(params.sintoma.nome)
    },
    complemento: params.complemento?.trim() || '',
    codigoCompleto
  };
}

export interface DiffCatalogoItem {
  perfil: string;
  tipo: 'SISTEMA' | 'COMPONENTE' | 'SINTOMA';
  acao: 'NOVO' | 'ALTERADO' | 'REMOVIDO';
  chave: string;
  descricao: string;
}

export interface ResultadoImportacaoCatalogo {
  catalogo: CatalogoCompacto;
  perfisLidos: string[];
  diffs: DiffCatalogoItem[];
}

const PERFIS_VALIDOS_PLANILHA = [
  'CRMEC', 'CREL', 'EH', 'MN', 'PM-RC', 'TE', 'CA', 'CD-CL-CO-CP-CG', 'EP-TH-PL', 'PF'
];

export function lerPlanilhaCatalogoXlsx(buffer: ArrayBuffer): ResultadoImportacaoCatalogo {
  const wb = XLSX.read(buffer, { type: 'array' });
  const baseAtiva = CATALOGO_FALHAS;
  const novoCatalogo: CatalogoCompacto = { ...baseAtiva };
  const perfisLidosSet = new Set<string>();

  type MapaSistemasTemp = Map<string, {
    codigo: string;
    nome: string;
    componentesMap: Map<string, {
      codigo: string;
      nome: string;
      sintomas: [string, string][];
    }>;
  }>;

  const acumuladorPorPerfil = new Map<string, MapaSistemasTemp>();
  const getMapaPerfil = (perfil: string): MapaSistemasTemp => {
    if (!acumuladorPorPerfil.has(perfil)) {
      acumuladorPorPerfil.set(perfil, new Map());
    }
    return acumuladorPorPerfil.get(perfil)!;
  };

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length === 0) continue;

    const nomeLimpo = sheetName.trim().toUpperCase();
    const perfilMatch = PERFIS_VALIDOS_PLANILHA.find(p => p === nomeLimpo);
    if (!perfilMatch) continue;

    let headerRowIdx = -1;
    let colSisCod = 1;
    let colSisNome = 2;
    let colCompCod = 3;
    let colCompNome = 4;
    let colSintCod = 5;
    let colSintNome = 6;

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r].map(c => removerAcentos(String(c || '')));
      const idxSistemas = row.findIndex(c => c === 'sistemas' || c === 'sistema' || c === 'cod_sistema');
      const idxComponentes = row.findIndex(c => c === 'componentes' || c === 'componente' || c === 'cod_componente');
      const idxSintomas = row.findIndex(c => c === 'sintomas' || c === 'sintoma' || c === 'cod_sintoma');

      if (idxSistemas >= 1 && idxComponentes > idxSistemas && idxSintomas > idxComponentes) {
        headerRowIdx = r;
        colSisCod = idxSistemas - 1;
        colSisNome = idxSistemas;
        colCompCod = idxComponentes - 1;
        colCompNome = idxComponentes;
        colSintCod = idxSintomas - 1;
        colSintNome = idxSintomas;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const sistemasMap = getMapaPerfil(perfilMatch);
    let ultimoSisCod = '';
    let ultimoSisNome = '';
    let ultimoCompCod = '';
    let ultimoCompNome = '';

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawSisCod = String(row[colSisCod] ?? '').trim();
      const rawSisNome = String(row[colSisNome] ?? '').trim();
      const rawCompCod = String(row[colCompCod] ?? '').trim();
      const rawCompNome = String(row[colCompNome] ?? '').trim();
      const rawSintCod = String(row[colSintCod] ?? '').trim();
      const rawSintNome = String(row[colSintNome] ?? '').trim();

      if (!rawSisCod && !rawSisNome && !rawCompCod && !rawCompNome && !rawSintCod && !rawSintNome) {
        continue;
      }

      if (rawSisCod || rawSisNome) {
        const novoSisCod = rawSisCod || ultimoSisCod;
        if (novoSisCod !== ultimoSisCod) {
          ultimoCompCod = '';
          ultimoCompNome = '';
        }
        ultimoSisCod = novoSisCod;
        ultimoSisNome = rawSisNome || ultimoSisNome;
      }

      if (rawCompCod || rawCompNome) {
        ultimoCompCod = rawCompCod || ultimoCompCod;
        ultimoCompNome = rawCompNome || ultimoCompNome;
      }

      if (!ultimoSisCod || !ultimoCompCod || (!rawSintCod && !rawSintNome)) {
        continue;
      }

      if (!sistemasMap.has(ultimoSisCod)) {
        sistemasMap.set(ultimoSisCod, {
          codigo: ultimoSisCod,
          nome: ultimoSisNome || ultimoSisCod,
          componentesMap: new Map()
        });
      }
      const sisEntry = sistemasMap.get(ultimoSisCod)!;

      if (!sisEntry.componentesMap.has(ultimoCompCod)) {
        sisEntry.componentesMap.set(ultimoCompCod, {
          codigo: ultimoCompCod,
          nome: ultimoCompNome || ultimoCompCod,
          sintomas: []
        });
      }
      const compEntry = sisEntry.componentesMap.get(ultimoCompCod)!;

      const sintCodFinal = rawSintCod || rawSintNome;
      const sintNomeFinal = rawSintNome || rawSintCod;
      if (!compEntry.sintomas.some(([c]) => c === sintCodFinal)) {
        compEntry.sintomas.push([sintCodFinal, sintNomeFinal]);
      }
    }
  }

  for (const [perfil, sistemasMap] of acumuladorPorPerfil.entries()) {
    if (sistemasMap.size > 0) {
      const sistemasCompactos: [string, string, [string, string, [string, string][]][]][] = [];
      for (const sis of sistemasMap.values()) {
        const compsCompactos: [string, string, [string, string][]][] = [];
        for (const comp of sis.componentesMap.values()) {
          compsCompactos.push([comp.codigo, comp.nome, comp.sintomas]);
        }
        sistemasCompactos.push([sis.codigo, sis.nome, compsCompactos]);
      }
      novoCatalogo[perfil] = sistemasCompactos;
      perfisLidosSet.add(perfil);
    }
  }

  const perfisLidos = Array.from(perfisLidosSet);
  const diffs = calcularDiffCatalogo(baseAtiva, novoCatalogo);
  return {
    catalogo: novoCatalogo,
    perfisLidos,
    diffs
  };
}

export function calcularDiffCatalogo(
  antigo: CatalogoCompacto,
  novo: CatalogoCompacto
): DiffCatalogoItem[] {
  const diffs: DiffCatalogoItem[] = [];
  const perfis = Array.from(new Set([...Object.keys(antigo), ...Object.keys(novo)]));

  for (const perfil of perfis) {
    const sisAntigos = new Map((antigo[perfil] || []).map(([c, n, comps]) => [c, { nome: n, comps }]));
    const sisNovos = new Map((novo[perfil] || []).map(([c, n, comps]) => [c, { nome: n, comps }]));

    for (const [codSis, dadosSis] of sisNovos.entries()) {
      if (!sisAntigos.has(codSis)) {
        diffs.push({
          perfil,
          tipo: 'SISTEMA',
          acao: 'NOVO',
          chave: `${perfil}/${codSis}`,
          descricao: `Sistema ${codSis} – ${dadosSis.nome}`
        });
      }
    }

    for (const [codSis, dadosSis] of sisAntigos.entries()) {
      if (!sisNovos.has(codSis)) {
        diffs.push({
          perfil,
          tipo: 'SISTEMA',
          acao: 'REMOVIDO',
          chave: `${perfil}/${codSis}`,
          descricao: `Sistema ${codSis} – ${dadosSis.nome}`
        });
      }
    }
  }

  return diffs;
}
