import { Tecnico } from '../types';
import { formatarNomeSobrenome, normalizarGrupoTecnico, normalizarMatricula } from '../lib/uEmDataUtils';

export const CSV_TECNICOS_PADRAO = `MATRICULA;NOME;FUNCAO;GRUPO;SECAO
025918;Samyres Maiury Brito Cabral;APRENDIZ;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028657;Amanda Pereira Oliveira;ASSISTENTE ADMINISTRATIVO I;ADMINISTRATIVO;UMCAMAN - Manutenção - Turma 2
028655;Kayllane Nunes de Almeida;ASSISTENTE ADMINISTRATIVO I;ADMINISTRATIVO;UMCAMAN - Manutenção - Turma 2
025032;Jorge Luiz Volpe;ASSISTENTE TECNICO II;ADMINISTRATIVO;UMCAMAN - Manutenção - Turma 1
024833;Alexsandro de Jesus Meireles;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026332;Antonio Francisco Peres;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028158;Cleicimar Nunes da Silva;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024742;Derik Vinicius Vasconcelos da Silva;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024227;Donizete de Araujo de Sousa;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024649;Edivan Silva dos Santos;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
025644;Felipe Adrian Monteiro dos Santos;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023347;Francisco Leite de Oliveira;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
022527;Francisco Lima de Sa;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024582;Francisco Pereira da Silva;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023809;Franquinelio de Sousa Vale;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023077;Glaucio Catryel Oliveira da Silva;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026378;Gustavo Ribeiro Lira;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028304;Heitor Gabriel de Sousa Pereira;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024738;Jenilson Almeida dos Anjos;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
021369;Jose de Ribamar Lima das Neves;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024849;Jose Pereira da Silva Filho;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023451;Jose Wanderson Silva Lima;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024834;Leandro Nunes Cardoso;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026441;Leilson da Conceicao Santos;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026327;Luan Felipe da Costa Oliveira;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023011;Luis Carlos Rodrigues Baia;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028311;Mateus Oliveira da Silva;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024648;Melquiades Gomes de Lima Neto;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026532;Mikeias de Lima Rodrigues;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024539;Rubiam Rodrigues Medrado;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024213;Stenio Bessa Cardoso;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028579;Yago Serafim Lima;AUXILIAR DE LUBRIFICACAO;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
027485;Alcivan Barbosa Rocha;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026305;Alexsandro Coutinho da Silva;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027824;Alison Carlos Reis de Souza;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025469;Alonso Manuel Silva Sousa;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028543;Anderson Kaleb Santos Pimentel;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025451;Antonio Carlos Macedo Carneiro;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
024605;Antonio Marcos dos Santos Novais Junior;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025009;Antonio Reis Lima Freitas;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026673;Caique Daniel Silva Dzindzik;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027503;Carlos Eduardo de Lima Oliveira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025462;Celio da Conceicao Duraes;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
024791;Clenilton Ferreira Serafim;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026330;Daniel Chaves Lima;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027822;Danielson Souza dos Santos;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026329;Davit Rian da Silva Pereira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025473;Eziel dos Santos Delgado;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027714;Felipe Moura de Souza;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 1
026340;Filipe Leite Silva;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028524;Gabriel Frank dos Santos Rocha;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027818;Geansales Rodrigues Pinho;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028305;Janaina dos Santos Pereira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026356;Jean Henrique Teixeira Siqueira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028530;Jefeson Gomes Pinheiro;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026333;Jhonatan Henrique Silva Sousa;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027826;Jonas Rafael Silva dos Santos;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026545;Jordany Mateo Rojas Pereira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025455;Jose de Ribamar dos Santos Menezes;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028339;Jose Everton do Nascimento Freitas;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027498;Jose Gustavo Almeida dos Santos;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025449;Kaic Oliveira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028531;Leandro dos Santos Ferreira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025378;Lourival Kauan Assuncao Guedes;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028091;Luan Pereira Araujo Silva;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026391;Lucas Martins de Santana;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025434;Mario Cleuson Resende Pinto;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026798;Milena Silva da Costa;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025439;Paulo Sergio Sousa da Silva;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025777;Paulo Silas Oliveira Batista;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025408;Raikelvyson Raeymaeker Ramos Santana;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027489;Rian de Sousa Rodrigues;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027506;Rilson Silva Araujo;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025433;Ronald Kawan Silva Conrado;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028044;Samuel Lima da Silva;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025379;Uilans Lima da Silva;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027521;Ulisses Carvalho Araujo;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027523;Valdir Sudario Salasar Junior;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025395;Vinicius de Oliveira Novais;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025006;Wallisson Silva Santos;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026665;Walterley dos Santos Garcia;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026669;Wanderson Silva Ferreira;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028362;Wellison Pereira Sodre;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
026326;Wendreo Smith Furtado dos Santos;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028075;Wennerson de Abreu Matos;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
025858;Werlison Conceicao de Sa;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
027825;Wesley Freitas Melo;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028382;Weslley Brandao Correia;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028046;Wevesks de Sousa Damascena;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028341;Wilmar do Rosario Campos Junior;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
028527;Ykaro Ian da Silva Simao;AUXILIAR DE MANUTENCAO;AUXILIAR;UMCAMAN - Manutenção - Turma 2
024792;Edivan Feitosa;BORRACHEIRO I;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
024784;Marcolino Rodrigues Aguiar;BORRACHEIRO I;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
027398;Ozorio Franco de Oliveira Neto;BORRACHEIRO I;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
024729;Eliude de Lima Costa;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
026344;Francisco Mario Moura da Luz;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
027396;Inaldo Quirino de Oliveira;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
024329;Israel Goncalves da Silva;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
026455;Jose Silvano de Jesus;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
024387;Paulo Cesar da Conceicao Nascimento;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
027397;Raunilson Sousa Vieira;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
026390;Waderson Rocha Maciel;BORRACHEIRO II;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
026604;Roberto Loures da Silva Junior;CONTROLADOR DE MANUTENCAO II;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
028298;Antonio Eduardo Silva de Sousa;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028159;Caique Costa Martins;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
026697;Daniel Ferreira de Oliveira;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028359;David Kennedy Santos de Sousa;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
023740;Erika Luana Neves Guimaraes;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
025457;Media Leao Soares;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
024212;Yan Matheus Novais Amorim;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
025456;Yuri Oliveira Silva Nunes;ELETRICISTA I;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028197;David Lima Mota;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
027918;Diego Pereira de Sousa;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
026359;Egrinaldo Lopes da Silva;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028133;Geam Costa Silva;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028360;Gilmar dos Santos de Sousa;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
027443;Marcelo Fernandes Santos Batista;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
020798;Marcos Aurelio Costa Assuncao;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
023854;Paulo Sergio dos Santos Dias;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
024661;Rafael Pereira da Silva;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
027964;Roberto Ribeiro da Costa;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 1
027400;Ronivaldo de Melo Sarmento;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028164;Wellington Araujo Reis;ELETRICISTA II;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
017913;Alex Sandro Santos Alves;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028041;Anildo da Silva Oliveira;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
022306;Antonio Luiz da Silva Carvalho;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
025616;Arlesson Diniz da Silva;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
017698;Aurelio do Espirito Santo Marques;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
028125;Fabio Pereira da Silva;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
025666;Gilvan de Souza Coelho;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
022769;Jonatas Cutrim dos Santos Bona;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
021011;Jose Hailton de Oliveira Correa;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
027399;Jose Portela de Moura;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
025668;Josemir Rodrigues Rosa;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
020636;Marcelo Moreira de Souza;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
024408;Mauricio Matheus Lima dos Santos;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
024328;Thiago da Cunha dos Reis;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
019469;Vinicius Silva Vieira;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
026619;Willa da Costa Silva;ELETRICISTA III;ELETRICISTA;UMCAMAN - Manutenção - Turma 2
026882;Jose Antonio da Silva Neto;ENGENHEIRO TRAINEE;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
013689;Jose Antonio da Silva do Carmo;GERENTE DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
024179;Leandro Cruz de Matos;INSPETOR DE EQUIPAMENTOS I;INSPETOR;UMCAMAN - Manutenção - Turma 1
023774;Oseas Marques dos Santos Junior;INSPETOR DE EQUIPAMENTOS I;INSPETOR;UMCAMAN - Manutenção - Turma 1
027151;Paulo Felipe Silva de Sousa;INSPETOR DE EQUIPAMENTOS I;INSPETOR;UMCAMAN - Manutenção - Turma 1
025554;Vitor Sacramento Melo;INSPETOR DE EQUIPAMENTOS I;INSPETOR;UMCAMAN - Manutenção - Turma 1
027081;Antonio de Sousa Silva;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
023097;Edielson Portilho da Cruz;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028301;Eliabe Alves de Sousa Machado;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
025780;Elinelson Silva de Araujo;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028345;Everson Marvison da Silva Garcia;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028377;Francisco Simao Lima dos Santos;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
025412;Gabriel de Jesus Santos;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
025413;Jeferson Sabino da Silva;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028343;Manoel Sousa Coutinho;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
027153;Matheus Rykeume Silva Lima;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028361;Paulo dos Santos da Silva;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028310;Pedro Henrique Ribeiro da Silva;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028074;Railson de Lima Ferreira;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028082;Railson Pereira da Silva;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
025417;Wesley Lima dos Santos;LAVADOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
022855;Donisvaldo dos Santos Mesquita;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
027402;Edson Luiz de Jesus Pinto;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
022494;Elison da Silva Araujo;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023734;Jonas Passos da Silva;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024846;Jose Wilson Morais Sousa;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028101;Juliane Sousa de Almeida;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
021035;Kayky Oliveira Alves;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023662;Rafael do Socorro Moraes Ribeiro;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023741;Thiago Pereira Silva;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028110;Welton de Paiva Sousa;LUBRIFICADOR I;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023824;Antoniel Furtado Lima;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
017684;Cicero Vieira da Silva;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
027401;Cleuma Ribeiro;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028337;Dalcilei Martins dos Santos;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023959;Daniel Alves dos Santos;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
028300;Edinaldo da Silva Souza;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
025782;Edinho Rodrigues de Araujo;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026144;Edson Nero Feitosa;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024178;Helis Aires Farias;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
027493;Helizone Torres Lima;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
025805;Izaque Coutinho Souza;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026535;Jackson Lima de Sousa;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024266;Joao Viana Santos;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026383;Jose Aribatan Santos Lima;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023079;Josias Feitosa da Silva;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
019048;Luis Carlos Cruz do Nascimento;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
026443;Maciel Oliveira Souza;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
023475;Roberto Feitosa Cirio;LUBRIFICADOR II;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
016114;Geziel Ferreira Lima;LUBRIFICADOR III;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
024808;Tiago Carvalho Vidal;LUBRIFICADOR III;LUBRIFICADOR;UMCAMAN - Manutenção - Turma 2
016724;Graciano Soares de Sousa;MECANICO BORRACHEIRO;BORRACHEIRO;UMCAMAN - Manutenção - Turma 2
024806;Diego Almeida da Silva;MECANICO ESPECIALIZADO;MECANICO;UMCAMAN - Manutenção - Turma 2
025715;Marcelo Anderson de Lima Silva;MECANICO ESPECIALIZADO;MECANICO;UMCAMAN - Manutenção - Turma 2
027525;Wander Gomes da Silva;MECANICO ESPECIALIZADO;MECANICO;UMCAMAN - Manutenção - Turma 2
022530;Adonay Rodrigues da Silva;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
021029;Alexandre dos Reis Ferreira;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
022992;Franceilton da Silva Pereira;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
024264;Franquinildo Alves Leitao;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
024296;Jose Lucas Silva Ferreira;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
027765;Josefran Alves da Silva;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
023835;Lucas dos Santos Silva;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
021018;Maicon Douglas Silva da Silva;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
024416;Marcelo Alves de Freitas;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
027486;Matheus Costa Silva;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
027762;Raylson Sousa Nunes;MECANICO I;MECANICO;UMCAMAN - Manutenção - Turma 2
028336;Ademir da Silva;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
027817;Adriano dos Santos Sousa;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028193;Antonio Marcelo de Oliveira da Silva;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028383;Arilton Leite Arouche;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028129;Cicero Chagas Vieira;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
024295;Cleilton Pereira da Silva;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
026492;Davi do Nascimento Fandim;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
024343;Denisom Lima da Silva;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
018468;Djavanisson Barbosa Sousa;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028357;Edson Bezerra Ferreira;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
027921;Edson Costa dos Santos;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 1
019536;Elesbao Emanuel Felix dos Santos;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
027766;Elton Luiz Assuncao de Oliveira;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
024379;Francinaldo Belfort Trindade;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028162;Francisco Braga Pereira;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
025677;Gefiter da Silva Matos;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028303;Haroldo Henrique dos Santos Sousa;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028342;Iago Nascimento dos Reis;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
027962;Isaias Araujo Moura;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
023085;Jose Alves de Sales;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028662;Leilson de Brito Carvalho;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
027500;Nedson Costa Golveia;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
028346;Oseias de Sousa Reis;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
022880;Oziel de Sousa Silva;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
026667;Raimundo Osvaldo Rodrigues do Nascimento;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
021166;Samuel de Sousa Ferreira;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
020948;Thiago dos Santos Ferraz;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
022885;Ubiratan Pereira Magalhaes;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
026618;Waldonez Pereira Queiroz;MECANICO II;MECANICO;UMCAMAN - Manutenção - Turma 2
021006;Aldiceli Santos da Silva Ferreira;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
016967;Almir da Gama Sarges;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
018810;Angelo Marcos da Silva;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
028297;Angelo Santos Vasconcelos;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
018781;Arnaldo Alves de Sousa;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
028157;Carlos Augusto Pinheiro Costa;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
021880;Enio Brito Leite;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
028548;Fabiano de Freitas Barbosa;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
028450;Jose Viana da Silva Netto;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
026522;Maicon de Andrade Madeira;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
018565;Otacilio da Silva Vale;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
021309;Paulo Vitor Matos Mota;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
017760;Pedro Wdys Silva de Souza;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
022611;Rodrigo Sousa;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
020974;Welson Silva de Souza;MECANICO III;MECANICO;UMCAMAN - Manutenção - Turma 2
025781;Abraao Alves da Silva;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
024840;Angelo Samuel Moraes;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 1
026533;Antonio Clecio Silva de Andrade;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026406;Carlos Andre Pereira de Souza;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026382;Fernando dos Santos Lopes;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
024143;Geremias Moreira da Costa Jardim;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
024466;Gilson Tiburco de Castro;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
024880;Gilvan Barros da Silva;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026672;Hugo Jose da Silva Pereira;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028154;Israel Mendes de Sousa;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028113;Jadiel Lima Pinheiro;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026399;Jhon Victor Melo Cunha;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026407;Leonardo Pereira Viana;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026357;Lilia Rocha de Souza;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026413;Liliane Costa de Souza;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026497;Marcelo Torres Barros;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028117;Mauricio Souza Lopes;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028574;Paulo Adriano Costa Lopes Junior;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028042;Wallison Luz Cruz;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
018850;Zetty Gusmao Ribeiro;MOTORISTA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
027098;Damiao de Oliveira Pereira;OPERADOR DE EMPILHADEIRA;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
025474;Cristiano Ribeiro da Cunha;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
024819;Fabio Junior Goncalves Pereira;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
023314;Francisco de Assis Silva;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028034;Gean Cris Carvalho da Silva;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
025447;James da Silva Leite;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028160;Jerry de Sousa Lima;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
028123;Joao Rivelino Fernandes dos Santos;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
026494;Manuel Teles Bezerra;OPERADOR DE GUINDAUTO;OPERADOR/MOTORISTA;UMCAMAN - Manutenção - Turma 2
019413;Bruno Fernandes Sousa;PINTOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
028033;Josenaldo Helio Dias Pereira;PINTOR;LAVADOR/PINTOR;UMCAMAN - Manutenção - Turma 2
022894;Cristiano Pureza Rodrigues;SOLDADOR I;SOLDADOR;UMCAMAN - Manutenção - Turma 2
024557;Francisco das Chagas da Conceicao;SOLDADOR I;SOLDADOR;UMCAMAN - Manutenção - Turma 2
025584;Gecivaldo Alves dos Santos;SOLDADOR I;SOLDADOR;UMCAMAN - Manutenção - Turma 2
027226;Hallyson Nael Oliveira Soeiro;SOLDADOR I;SOLDADOR;UMCAMAN - Manutenção - Turma 2
028043;Mario Sergio da Silva;SOLDADOR I;SOLDADOR;UMCAMAN - Manutenção - Turma 2
025647;Robson Mayck Alves Batista;SOLDADOR I;SOLDADOR;UMCAMAN - Manutenção - Turma 2
023315;Adriano Teixeira do Amaral;SOLDADOR II;SOLDADOR;UMCAMAN - Manutenção - Turma 2
028088;Elizon Rodrigues de Brito;SOLDADOR II;SOLDADOR;UMCAMAN - Manutenção - Turma 2
028099;Francielson Silva de Sousa;SOLDADOR II;SOLDADOR;UMCAMAN - Manutenção - Turma 2
028039;Gilvan Ferreira Silva;SOLDADOR II;SOLDADOR;UMCAMAN - Manutenção - Turma 2
027764;Heilton Silva Pinho;SOLDADOR II;SOLDADOR;UMCAMAN - Manutenção - Turma 2
028104;Jefferson Monteiro Botelho;SOLDADOR II;SOLDADOR;UMCAMAN - Manutenção - Turma 2
028084;Joelio Mecenas Neves;SOLDADOR II;SOLDADOR;UMCAMAN - Manutenção - Turma 2
014080;Valdeci Ferreira de Lima;SOLDADOR III;SOLDADOR;UMCAMAN - Manutenção - Turma 2
014098;Ademar Ferreira Guedes Filho;SUPERVISOR DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
028067;Augusto Carlos do Amaral;SUPERVISOR DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 2
016520;Gilmar Nascimento Santos;SUPERVISOR DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
027726;Ivanildo Ferreira Soares;SUPERVISOR DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
021063;Julio Cesar Rocha Vieira;SUPERVISOR DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
028016;Marcos Pereira dos Santos;SUPERVISOR DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 2
020973;Paulo Kartegiano Costa Cabral;SUPERVISOR DE MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 1
019412;Mizael Castilho dos Santos;SUPERVISOR GERAL MANUTENCAO;SUPERVISAO;UMCAMAN - Manutenção - Turma 1`;

export function getTecnicosIniciaisPadrao(): Tecnico[] {
  const linhas = CSV_TECNICOS_PADRAO.trim().split(/\r?\n/);
  const lista: Tecnico[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const partes = linha.split(';');
    if (partes.length < 3) continue;
    const matricula = normalizarMatricula(partes[0]);
    const nome = formatarNomeSobrenome(partes[1] || '');
    const funcao = (partes[2] || 'Mecânico').trim();
    const grupoBruto = (partes[3] || '').trim();
    const secao = (partes[4] || '').trim();
    if (!matricula || !nome) continue;

    const grupo = normalizarGrupoTecnico(grupoBruto, funcao);
    lista.push({
      id: `tec-${matricula}`,
      matricula,
      nome,
      funcao,
      grupo,
      secao,
      status: 'ativo',
      createdAt: '2026-01-01T00:00:00.000Z',
      atualizadoEm: '2026-01-01T00:00:00.000Z'
    });
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
