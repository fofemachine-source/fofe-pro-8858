import { Preventiva } from '../types';

export const PRESET_PREVENTIVAS: Omit<Preventiva, 'id' | 'createdAt'>[] = [
  // --- TABLE 1: PROGRAMAÇÃO DE PREVENTIVA UMCA (EM ANDAMENTO / CONFIRMADO) ---
  {
    equipamento: 'EH-5003',
    dataInicio: '10/06/2026',
    dataParada: '10/06',
    usuario: 'admin',
    horaPreventiva: '3000',
    horasPmppConfirmada: '18',
    limiteHorimetro: '8644',
    statusPreventiva: 'EM ANDAMENTO'
  },
  {
    equipamento: 'TI-1015',
    dataInicio: '16/06/2026',
    dataParada: '16/06',
    usuario: 'admin',
    horaPreventiva: '250',
    horasPmppConfirmada: '-1',
    limiteHorimetro: '14591',
    statusPreventiva: 'EM ANDAMENTO'
  },
  {
    equipamento: 'UC-1026',
    dataInicio: '16/06/2026',
    dataParada: '16/06',
    usuario: 'admin',
    horaPreventiva: 'A',
    horasPmppConfirmada: '1',
    limiteHorimetro: '',
    statusPreventiva: 'CONFIRMADO'
  },
  {
    equipamento: 'TE-4047',
    dataInicio: '18/06/2026',
    dataParada: '18/06',
    usuario: 'admin',
    horaPreventiva: '12000',
    horasPmppConfirmada: '3',
    limiteHorimetro: '12235',
    statusPreventiva: 'EM ANDAMENTO'
  },
  {
    equipamento: 'CG-1032',
    dataInicio: '19/06/2026',
    dataParada: '19/06',
    usuario: 'admin',
    horaPreventiva: '250',
    horasPmppConfirmada: '-7',
    limiteHorimetro: '2192',
    statusPreventiva: 'CONFIRMADO'
  },
  {
    equipamento: 'MN-3015',
    dataInicio: '19/06/2026',
    dataParada: '19/06',
    usuario: 'admin',
    horaPreventiva: '250',
    horasPmppConfirmada: '5',
    limiteHorimetro: '5098',
    statusPreventiva: 'CONFIRMADO'
  },
  {
    equipamento: 'CR-2520',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '-7',
    limiteHorimetro: '10446',
    statusPreventiva: 'EM ANDAMENTO'
  },
  {
    equipamento: 'TE-4039',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '-1',
    limiteHorimetro: '8767',
    statusPreventiva: 'CONFIRMADO'
  },

  // --- TABLE 2: EQUIPAMENTOS EM MONITORAMENTO (MONITORAR) ---
  {
    equipamento: 'TI-1009',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '0',
    limiteHorimetro: '13171',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'CR-2535',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '12000',
    horasPmppConfirmada: '2',
    limiteHorimetro: '12006',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'EH-2016',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '12',
    limiteHorimetro: '2501',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'EP-1018',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '250',
    horasPmppConfirmada: '16',
    limiteHorimetro: '271',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'EH-2018',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '250',
    horasPmppConfirmada: '17',
    limiteHorimetro: '2291',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'CR-2531',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '18',
    limiteHorimetro: '11454',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'EH-5036',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '250',
    horasPmppConfirmada: '22',
    limiteHorimetro: '14966',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'CR-2517',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '1000',
    horasPmppConfirmada: '22',
    limiteHorimetro: '12987',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'CR-3058',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '23',
    limiteHorimetro: '28376',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'TE-3018',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '25',
    limiteHorimetro: '7231',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'CR-2540',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '12000',
    horasPmppConfirmada: '30',
    limiteHorimetro: '12114',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'TE-3020',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '34',
    limiteHorimetro: '10580',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'CR-3106',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '500',
    horasPmppConfirmada: '36',
    limiteHorimetro: '7693',
    statusPreventiva: 'MONITORAR'
  },
  {
    equipamento: 'CR-2516',
    dataInicio: '22/06/2026',
    dataParada: '22/06',
    usuario: 'admin',
    horaPreventiva: '12000',
    horasPmppConfirmada: '37',
    limiteHorimetro: '12064',
    statusPreventiva: 'MONITORAR'
  }
];
