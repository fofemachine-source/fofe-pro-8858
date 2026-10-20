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

export const CATALOGO_FALHAS: CatalogoCompacto = {
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
  "CB": [
    ["AC","Ar condicionado",[["CP","Compressor",[["144","NA"]]],["LI","Linha",[["144","NA"]]],["CN","Condensador",[["144","NA"]]],["EV","Evaporador",[["144","NA"]]],["VL","Válvulas",[["144","NA"]]]]],
    ["AR","Arrefecimento",[["TC","Radiador",[["13","Obstrução"],["32","Danificado(a)"],["87","Vazamento"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["VT","Ventilador",[["32","Danificado(a)"],["49","Baixa performace"]]],["TB","Tubulação",[["32","Danificado(a)"],["87","Vazamento"]]],["V/O","Vedação/O-ring",[["87","Vazamento"]]],["OL","Óleo / Fluído",[["141","SOS Crítico"],["142","SOS Monitorar"],["14","Superaquecimento"]]]]],
    ["SPI","Supres. Incêndio",[["SPI","Supres. Incêndio",[["27","Extintor/Ampola danificado"],["40","Suporte danificado"],["48","Sensor danificado"],["108","Cartuchos danificado"],["112","Bicos difusores danificados"],["119","Extintor/Ampola vencido"],["124","Mecanismo disparador danificado"],["137","Mangueiras danificas"],["146","Princípio de Incêndio"]]]]],
    ["BR","Borracharia",[["RO","Roda",[["42","Trinca/Danificada"],["47","Parafuso de fixação quebrado"],["94","Alojamento espanado"]]],["PN","Pneu",[["39","Bolha"],["43","Corte banda lateral"],["50","Anel de vedação danificado"],["64","Rodízio de pneu"],["87","Vazamento"],["116","Desgaste banda lateral"]]]]],
    ["CB","Cabine",[["AMR","Amortecimento",[["93","Coxim/Amortecedores danificados"]]],["BNC","Banco",[["32","Danificado(a)"],["153","Amortecimento danificado"]]],["CS","Cinto de segurança",[["32","Danificado(a)"]]],["PAL","Pedais/ Alavancas",[["1","Falha de funcionalidade"],["22","Folga"],["32","Danificado(a)"]]],["PR","Porta",[["6","Trinca com defeito"],["8","Empeno"],["32","Danificado(a)"]]],["VD","Vidros",[["91","Trinca"],["128","Quebrado"]]],["JY","Joystick",[["1","Falha de funcionalidade"],["144","NA"]]]]],
    ["DRGR","Direção Geral",[["DRGR","Direção Geral",[["20","Barra de direção danificada"],["31","Setor de direção danificado"]]]]],
    ["EL","Elétrico",[["ALT","Alternador",[["144","Não se aplica"]]],["AS","Alarmes sonoros",[["144","Não se aplica"]]],["BÇ","Balança",[["144","NA"]]],["BT","Bateria",[["144","NA"]]],["BZ","Buzina",[["144","NA"]]],["CC","Curto-ciruito",[["144","NA"]]],["CG","Chave geral",[["144","NA"]]],["CH","Chicote",[["144","NA"]]],["IL","Iluminação",[["144","NA"]]],["IVR","Inversor",[["144","NA"]]],["LP","Limpador",[["144","NA"]]],["MA","Motor de arranque",[["144","NA"]]],["MC","Mau contato",[["144","NA"]]],["PI","Painel de instrumentos",[["144","NA"]]],["RA","Rádio",[["144","NA"]]],["SS","Sensor",[["144","NA"]]]]],
    ["ESGR","Estrutura Geral",[["CHS","Chassi",[["72","Pino/Parafuso danificado"],["80","Torção"],["91","Trinca"],["147","Pino âncora Folga/Danificado"]]],["ST","Suportes",[["32","Danificado(a)"]]]]],
    ["FRGR","Freio geral",[["FS","Freio de Serviço",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"],["32","Danificado(a)"]]],["FR","Freio Retardo",[["77","Baixa eficiência"],["32","Danificado(a)"]]],["FE","Freio de Estacionamento",[["10","Desgaste"],["11","Disco danificado"],["29","Filtro saturado"],["77","Baixa eficiência"],["87","Vazamento"],["92","Pinça danificada"]]]]],
    ["GX","Graxa",[["GRX","Graxeiro",[["32","Danificado(a)"],["44","Válvula de retenção travada"],["139","Entupido"]]],["IN","Injetor",[["5","Obstruído"],["32","Danificado(a)"],["101","Desregulado"]]],["MG","Mangueira de graxa",[["53","Ressecada/ Tramas expostas"],["87","Vazamento"]]],["PG","Propulsora de graxa",[["32","Danificado(a)"],["87","Vazamento"]]],["TG","Tambor/Tanque de graxa",[["87","Vazamento"],["121","Baixo nível de graxa"]]]]],
    ["IPROD","Implemento Rodoviários",[["BS","Báscula",[["24","Pino/Parafuso danificado"],["151","Trinca"]]],["CLLE","CL de elevação",[["0","Bucha/Olhal danificado"],["46","Quebra"]]],["TN","Tanque",[["67","Barulho/Vibração anormal"],["87","Vazamento"],["91","Trinca"]]],["MM","Mangueira/Mangote",[["32","Danificado(a)"],["87","Vazamento"]]],["CT","Carretel",[["32","Danificado(a)"]]],["BB","Bomba",[["32","Danificado(a)"],["76","Baixa Vazão"],["87","Vazamento"]]],["BI","Bico",[["32","Danificado(a)"]]],["FF","Filtro",[["10","Saturação"],["32","Danificado(a)"]]],["CP","Compressor",[["144","NA"]]],["MS","Máquina de solda",[["144","NA"]]],["MK","Munck",[["144","NA"]]],["RS","Registro",[["32","Danificado(a)"]]],["GU","Guincho",[["32","Danificado(a)"]]]]],
    ["MD","Motor",[["MD","Motor",[["3","Ruído/Vibração anormal"],["15","Turbina Danifica"],["23","Filtro de ar saturado"],["56","Alta pressão de cárter"],["69","Tubo de descarga danificado"],["75","Excesso de Fumaça"],["87","Vazamento"],["106","Correia Danificada"],["107","Filtro de combustível saturado"],["109","Baixa potência/ Shutdown"],["115","Baixa pressão de bomba"],["135","ECM/Sensores danificados"],["141","SOS Crítico"],["142","SOS Monitorar"],["145","PTO"],["148","Tanque Diesel Vazamento/Danificado"]]]]],
    ["SP","Suspensão",[["DD","Dianteira",[["0","Bucha/Olhal danificado"],["32","Danificado(a)"],["46","Quebra"],["87","Vazamento"],["132","Calibração"]]],["TA","Traseira",[["0","Bucha/Olhal danificado"],["32","Danificado(a)"],["46","Quebra"],["87","Vazamento"],["132","Calibração"]]]]],
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
 * Objeto de configuração fácil de editar para mapeamento de frotas CR
 */
export const MAPA_FROTA_CR: {
  CRMEC: string[];
  CREL: string[];
} = {
  CRMEC: ['25'], // Komatsu HD785, frota CR-25xx
  CREL: ['30', '31', '35'] // Komatsu 730E, frotas CR-30xx, CR-31xx e CR-35xx
};

export const DESCRICAO_PERFIS: Record<string, string> = {
  'CRMEC': 'CR Mecânico (HD785)',
  'CREL': 'CR Elétrico (730E)',
  'EH': 'EH – Escavadeiras',
  'MN': 'MN – Motoniveladoras',
  'PM-RC': 'PM-RC – Pás Carregadeiras / Rolos',
  'TE': 'TE – Tratores de Esteira',
  'CA': 'CA – Caminhões Articulados',
  'CB': 'CB – Caminhões Basculantes / Comboio',
  'CD-CL-CO-CP-CG': 'CD-CL-CO-CP-CG – Rodoviários / Apoio',
  'EP-TH-PL': 'EP-TH-PL – Empilhadeiras / Manipuladores',
  'PF': 'PF – Perfuratrizes'
};

const STORAGE_KEY_CATALOGO_CUSTOM = 'fofe_catalogo_falhas_custom_v1';

export interface CatalogoCustomizadoSalvo {
  catalogo: CatalogoCompacto;
  atualizadoEm: string;
  atualizadoPor: string;
  nomeArquivo?: string;
}

let cachedCustomCatalogo: CatalogoCustomizadoSalvo | null = null;

export function carregarCatalogoCustomizadoLocal(): CatalogoCustomizadoSalvo | null {
  if (cachedCustomCatalogo) return cachedCustomCatalogo;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOGO_CUSTOM);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogoCustomizadoSalvo;
    if (parsed && parsed.catalogo && typeof parsed.catalogo === 'object') {
      cachedCustomCatalogo = parsed;
      return parsed;
    }
  } catch (e) {
    console.warn('Falha ao ler catálogo customizado local:', e);
  }
  return null;
}

export function definirCatalogoCustomizado(dados: CatalogoCustomizadoSalvo | null): void {
  cachedCustomCatalogo = dados;
  if (typeof window === 'undefined') return;
  try {
    if (!dados) {
      localStorage.removeItem(STORAGE_KEY_CATALOGO_CUSTOM);
    } else {
      localStorage.setItem(STORAGE_KEY_CATALOGO_CUSTOM, JSON.stringify(dados));
    }
  } catch (e) {
    console.warn('Falha ao salvar catálogo customizado local:', e);
  }
}

export function obterFonteCatalogoAtiva(): CatalogoCompacto {
  const custom = carregarCatalogoCustomizadoLocal();
  if (custom && custom.catalogo && Object.keys(custom.catalogo).length > 0) {
    return custom.catalogo;
  }
  return CATALOGO_FALHAS;
}

/**
 * Converte o formato compacto do perfil para lista de objetos Sistema[]
 * Sempre usa o nome do sintoma do próprio perfil, nunca um dicionário global.
 */
export function getCatalogo(perfil: string): Sistema[] {
  if (!perfil) return [];
  const fonte = obterFonteCatalogoAtiva();
  const key = perfil.trim().toUpperCase();
  const sistemasRaw = fonte[key] || CATALOGO_FALHAS[key];
  if (!sistemasRaw) return [];

  return sistemasRaw.map(([codSis, nomeSis, componentesRaw]) => ({
    codigo: codSis,
    nome: nomeSis,
    componentes: (componentesRaw || []).map(([codComp, nomeComp, sintomasRaw]) => ({
      codigo: codComp,
      nome: nomeComp,
      sintomas: (sintomasRaw || []).map(([codSint, nomeSint]) => ({
        codigo: codSint,
        nome: nomeSint
      }))
    }))
  }));
}

/**
 * Lista todos os perfis disponíveis no catálogo ativo
 */
export function listarPerfis(): string[] {
  const fonte = obterFonteCatalogoAtiva();
  const keys = Object.keys(fonte);
  return keys.length > 0 ? keys : Object.keys(CATALOGO_FALHAS);
}

function removerAcentos(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca sem acento e sem diferenciar maiúsculas, por código ou nome de sistema, componente ou sintoma
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
 * 1. NORMALIZAÇÃO DA TAG
 * Converte para maiúsculas, insere hífen automaticamente ("eh4050", "EH4050", "EH 4050" -> "EH-4050")
 * e separa prefixo (letras) e número.
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
 * (ex.: CR-9999), exigindo pergunta ao usuário ("CR MECÂNICO" / "CR ELÉTRICO").
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
 * 2. FUNÇÃO perfilDaTag(tag): string | null
 * Regras pelo prefixo:
 * - EH → "EH" (escavadeiras)
 * - CR → número começando com 25 → "CRMEC"; começando com 30, 31 ou 35 → "CREL" (via MAPA_FROTA_CR)
 * - MN → "MN"
 * - PM ou RC → "PM-RC"
 * - TE → "TE"
 * - CA → "CA"
 * - CB → "CB"
 * - CD, CL, CO, CP ou CG → "CD-CL-CO-CP-CG"
 * - EP, TH ou PL → "EP-TH-PL"
 * - PF → "PF"
 * - Qualquer outro prefixo → null
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
    case 'PM':
    case 'RC':
      return 'PM-RC';
    case 'TE':
      return 'TE';
    case 'CA':
      return 'CA';
    case 'CB':
      return 'CB';
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
    case 'PF':
      return 'PF';
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
    const base = `${falha.sistema.codigo} › ${falha.componente.nome} › ${falha.sintoma.nome}`;
    return falha.complemento?.trim() ? `${base} (${falha.complemento.trim()})` : base;
  }
  return textoLegado?.trim() || '';
}

/**
 * Formata a exibição completa para Histórico e Detalhe do Relatório:
 * Ex.: "EH/HD/CV/1 · HD – Hidráulico EH › CV – Comando de Válvulas › 1 – Falha de funcionalidade"
 */
export function formatarFalhaDetalhe(falha?: FalhaCatalogada | null, textoLegado?: string | null): string {
  if (falha && falha.codigoCompleto) {
    const nomes = `${falha.sistema.codigo} – ${falha.sistema.nome} › ${falha.componente.codigo} – ${falha.componente.nome} › ${falha.sintoma.codigo} – ${falha.sintoma.nome}`;
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
    sintoma: { codigo: params.sintoma.codigo, nome: params.sintoma.nome },
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
  'CRMEC', 'CREL', 'EH', 'MN', 'PM-RC', 'TE', 'CA', 'CB', 'CD-CL-CO-CP-CG', 'EP-TH-PL', 'PF'
];

/**
 * Lê um arquivo .xlsx com SheetJS para importação de catálogo no painel Admin.
 * Suporta tanto:
 * 1) Planilha plana com colunas PERFIL_CATALOGO, COD_SISTEMA, SISTEMA, COD_COMPONENTE, COMPONENTE, COD_SINTOMA, SINTOMA
 * 2) Planilha com abas por perfil (CRMEC, CREL, EH, MN, PM-RC, TE, CA, CB, CD-CL-CO-CP-CG, EP-TH-PL, PF) e cabeçalho "Código | Sistemas | Código | Componentes | Código | Sintomas"
 */
export function lerPlanilhaCatalogoXlsx(buffer: ArrayBuffer): ResultadoImportacaoCatalogo {
  const wb = XLSX.read(buffer, { type: 'array' });
  const baseAtiva = obterFonteCatalogoAtiva();
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

    // Verifica se a aba possui coluna PERFIL_CATALOGO (formato plano)
    let flatHeaderRow = -1;
    let colPerfil = -1;
    let colFlatSisCod = -1;
    let colFlatSisNome = -1;
    let colFlatCompCod = -1;
    let colFlatCompNome = -1;
    let colFlatSintCod = -1;
    let colFlatSintNome = -1;

    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const rowNorm = rows[r].map(c => removerAcentos(String(c || '')).replace(/\s+/g, '_'));
      const idxP = rowNorm.findIndex(c => c === 'perfil_catalogo' || c === 'perfil');
      const idxSC = rowNorm.findIndex(c => c === 'cod_sistema' || c === 'codigo_sistema');
      const idxSN = rowNorm.findIndex(c => c === 'sistema' || c === 'sistemas' || c === 'nome_sistema');
      const idxCC = rowNorm.findIndex(c => c === 'cod_componente' || c === 'codigo_componente');
      const idxCN = rowNorm.findIndex(c => c === 'componente' || c === 'componentes' || c === 'nome_componente');
      const idxSiC = rowNorm.findIndex(c => c === 'cod_sintoma' || c === 'codigo_sintoma');
      const idxSiN = rowNorm.findIndex(c => c === 'sintoma' || c === 'sintomas' || c === 'nome_sintoma');

      if (idxP >= 0 && idxSC >= 0 && idxSN >= 0 && idxCC >= 0 && idxCN >= 0 && idxSiC >= 0 && idxSiN >= 0) {
        flatHeaderRow = r;
        colPerfil = idxP;
        colFlatSisCod = idxSC;
        colFlatSisNome = idxSN;
        colFlatCompCod = idxCC;
        colFlatCompNome = idxCN;
        colFlatSintCod = idxSiC;
        colFlatSintNome = idxSiN;
        break;
      }
    }

    if (flatHeaderRow >= 0) {
      let ultPerfil = '';
      let ultSisCod = '';
      let ultSisNome = '';
      let ultCompCod = '';
      let ultCompNome = '';

      for (let r = flatHeaderRow + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const pRaw = String(row[colPerfil] ?? '').trim().toUpperCase();
        const sCod = String(row[colFlatSisCod] ?? '').trim();
        const sNom = String(row[colFlatSisNome] ?? '').trim();
        const cCod = String(row[colFlatCompCod] ?? '').trim();
        const cNom = String(row[colFlatCompNome] ?? '').trim();
        const siCod = String(row[colFlatSintCod] ?? '').trim();
        const siNom = String(row[colFlatSintNome] ?? '').trim();

        if (!pRaw && !sCod && !sNom && !cCod && !cNom && !siCod && !siNom) continue;

        if (pRaw) {
          if (pRaw !== ultPerfil) {
            ultSisCod = '';
            ultSisNome = '';
            ultCompCod = '';
            ultCompNome = '';
          }
          ultPerfil = pRaw;
        }
        if (sCod || sNom) {
          const nCod = sCod || ultSisCod;
          if (nCod !== ultSisCod) {
            ultCompCod = '';
            ultCompNome = '';
          }
          ultSisCod = nCod;
          ultSisNome = sNom || ultSisNome;
        }
        if (cCod || cNom) {
          ultCompCod = cCod || ultCompCod;
          ultCompNome = cNom || ultCompNome;
        }

        if (!ultPerfil || !ultSisCod || !ultCompCod || (!siCod && !siNom)) continue;

        const mapaSistemas = getMapaPerfil(ultPerfil);
        if (!mapaSistemas.has(ultSisCod)) {
          mapaSistemas.set(ultSisCod, {
            codigo: ultSisCod,
            nome: ultSisNome || ultSisCod,
            componentesMap: new Map()
          });
        }
        const sisEntry = mapaSistemas.get(ultSisCod)!;
        if (!sisEntry.componentesMap.has(ultCompCod)) {
          sisEntry.componentesMap.set(ultCompCod, {
            codigo: ultCompCod,
            nome: ultCompNome || ultCompCod,
            sintomas: []
          });
        }
        const compEntry = sisEntry.componentesMap.get(ultCompCod)!;
        const sintCodFinal = siCod || siNom;
        const sintNomeFinal = siNom || siCod;
        if (!compEntry.sintomas.some(([c]) => c === sintCodFinal)) {
          compEntry.sintomas.push([sintCodFinal, sintNomeFinal]);
        }
      }
      continue;
    }

    // Formato de aba por perfil (ex.: CRMEC, CREL, EH, PF...)
    const nomeLimpo = sheetName.trim().toUpperCase();
    const perfilMatch = PERFIS_VALIDOS_PLANILHA.find(p => p === nomeLimpo) || (
      baseAtiva[nomeLimpo] ? nomeLimpo : null
    );
    if (!perfilMatch) continue;

    // Achar a linha de cabeçalho com "Código | Sistemas | Código | Componentes | Código | Sintomas"
    let headerRowIdx = -1;
    let colSisCod = 1; // Por padrão ignora Coluna A (0) -> B=1, C=2, D=3, E=4, F=5, G=6
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

    if (headerRowIdx === -1) {
      headerRowIdx = 0;
    }

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

/**
 * Calcula sistemas, componentes e sintomas novos e removidos entre dois catálogos
 */
export function calcularDiffCatalogo(
  antigo: CatalogoCompacto,
  novo: CatalogoCompacto
): DiffCatalogoItem[] {
  const diffs: DiffCatalogoItem[] = [];
  const perfis = Array.from(new Set([...Object.keys(antigo), ...Object.keys(novo)]));

  for (const perfil of perfis) {
    const sisAntigos = new Map((antigo[perfil] || []).map(([c, n, comps]) => [c, { nome: n, comps }]));
    const sisNovos = new Map((novo[perfil] || []).map(([c, n, comps]) => [c, { nome: n, comps }]));

    // Sistemas novos
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

    // Sistemas removidos
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

    // Componentes e Sintomas em sistemas em comum
    for (const [codSis, dadosSisNovo] of sisNovos.entries()) {
      const dadosSisAntigo = sisAntigos.get(codSis);
      if (!dadosSisAntigo) continue;

      const compsAntigos = new Map((dadosSisAntigo.comps || []).map(([c, n, sints]) => [c, { nome: n, sints }]));
      const compsNovos = new Map((dadosSisNovo.comps || []).map(([c, n, sints]) => [c, { nome: n, sints }]));

      for (const [codComp, dadosComp] of compsNovos.entries()) {
        if (!compsAntigos.has(codComp)) {
          diffs.push({
            perfil,
            tipo: 'COMPONENTE',
            acao: 'NOVO',
            chave: `${perfil}/${codSis}/${codComp}`,
            descricao: `${codSis} › Componente ${codComp} – ${dadosComp.nome}`
          });
        }
      }

      for (const [codComp, dadosComp] of compsAntigos.entries()) {
        if (!compsNovos.has(codComp)) {
          diffs.push({
            perfil,
            tipo: 'COMPONENTE',
            acao: 'REMOVIDO',
            chave: `${perfil}/${codSis}/${codComp}`,
            descricao: `${codSis} › Componente ${codComp} – ${dadosComp.nome}`
          });
        }
      }

      for (const [codComp, dadosCompNovo] of compsNovos.entries()) {
        const dadosCompAntigo = compsAntigos.get(codComp);
        if (!dadosCompAntigo) continue;

        const sintsAntigos = new Map((dadosCompAntigo.sints || []).map(([c, n]) => [c, n]));
        const sintsNovos = new Map((dadosCompNovo.sints || []).map(([c, n]) => [c, n]));

        for (const [codSint, nomeSint] of sintsNovos.entries()) {
          if (!sintsAntigos.has(codSint)) {
            diffs.push({
              perfil,
              tipo: 'SINTOMA',
              acao: 'NOVO',
              chave: `${perfil}/${codSis}/${codComp}/${codSint}`,
              descricao: `${codSis} › ${codComp} › Sintoma ${codSint} – ${nomeSint}`
            });
          }
        }

        for (const [codSint, nomeSint] of sintsAntigos.entries()) {
          if (!sintsNovos.has(codSint)) {
            diffs.push({
              perfil,
              tipo: 'SINTOMA',
              acao: 'REMOVIDO',
              chave: `${perfil}/${codSis}/${codComp}/${codSint}`,
              descricao: `${codSis} › ${codComp} › Sintoma ${codSint} – ${nomeSint}`
            });
          }
        }
      }
    }
  }

  return diffs;
}
