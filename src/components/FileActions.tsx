import { Report } from '../types';
import { getGreetingForTime } from '../lib/greetings';

/**
 * Utility to format dates in pt-BR locale
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

/**
 * Utility to format Date and Time (e.g. 2026-06-11T14:30) in pt-BR locale
 */
export function formatDateTime(dateTimeString: string | undefined): string {
  if (!dateTimeString) return '—';
  try {
    const parts = dateTimeString.split('T');
    const datePart = parts[0];
    const timePart = parts[1];
    if (!datePart) return dateTimeString;
    
    const dateParts = datePart.split('-');
    if (dateParts.length === 3) {
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      return timePart ? `${formattedDate} às ${timePart}` : formattedDate;
    }
    return dateTimeString;
  } catch {
    return dateTimeString;
  }
}

/**
 * Downloads a simple text representation formatted exactly as requested
 */
export function downloadReportAsTXT(report: Report) {
  // Get the first item's horaInicio to determine the correct greeting, or fallback
  const firstHora = report.atendimentos?.[0]?.horaInicio;
  const greeting = getGreetingForTime(report.shift, firstHora);

  let content = `RELATÓRIO DE MANUTENÇÃO\n`;
  content += `U&M MINERAÇÃO\n\n`;
  content += `Turma: ${report.team}\n\n`;
  content += `Horário: ${report.shift}\n\n`;
  content += `Data: ${formatDate(report.dateStart)} a ${formatDate(report.dateEnd)}\n\n`;
  content += `FRENTE ${report.frente}\n\n`;
  if (report.tecnicoNome) {
    const role = report.tecnicoFuncao || 'Técnico';
    content += `${role}: ${report.tecnicoNome}\n\n`;
  } else {
    if (report.monitor) {
      content += `Monitor: ${report.monitor}\n\n`;
    }
    content += `Eletricista: ${report.eletricista || 'Não informado'}\n\n`;
    content += `Mecânico: ${report.mecanico || 'Não informado'}\n\n`;
    content += `Auxiliar: ${report.auxiliar || 'Não informado'}\n\n`;
    content += `Motorista: ${report.motorista || 'Não informado'}\n\n`;
  }
  content += `------------------------------------------------\n\n`;

  if (report.atendimentos && report.atendimentos.length > 0) {
    report.atendimentos.forEach((at) => {
      content += `${at.equipamento}\n\n`;
      content += `OM: ${at.om || 'N/A'}\n\n`;
      content += `Horímetro: ${at.horimetro || 'N/A'}\n\n`;
      content += `Sintoma:\n${at.sintoma || 'N/A'}\n\n`;
      content += `Causa:\n${at.causa || 'N/A'}\n\n`;
      content += `Ação:\n${at.acaoExecutada || 'N/A'}\n\n`;
      content += `Início:\n${at.horaInicio || 'N/A'}\n\n`;
      content += `Fim:\n${at.horaFim || 'N/A'}\n\n`;
      content += `Atuantes:\n${at.atuantes || 'N/A'}\n\n`;
      const photosCount = (at.photoUrls && at.photoUrls.length > 0) ? at.photoUrls.length : (at.photoUrl ? 1 : 0);
      if (photosCount > 0) {
        content += `Fotos: [${photosCount} Imagem(ns) Anexada(s)]\n\n`;
      }
      content += `------------------------------------------------\n\n`;
    });
  } else {
    content += `Nenhum Atendimento Registrado.\n\n`;
    content += `------------------------------------------------\n\n`;
  }

  content += `PENDÊNCIAS\n\n`;
  if (report.pendencias && report.pendencias.length > 0) {
    report.pendencias.forEach((p) => {
      content += `${p.equipamento}\n\n`;
      content += `${p.descricao}\n\n`;
    });
  } else {
    content += `Nenhuma pendência registrada.\n\n`;
  }

  content += `------------------------------------------------\n\n`;
  if (report.observacoesGerais) {
    content += `OBSERVAÇÕES GERAIS:\n${report.observacoesGerais}\n\n`;
    content += `------------------------------------------------\n\n`;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_de_manutencao_${report.team.replace(/\s+/g, '_')}_${report.frente}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers browser print utilizing a super premium, clean, one-page compliant layout.
 */
export function printReportAsPDF(report: Report) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups para gerar a visualização.');
    return;
  }

  // Determine the correct greeting based on first equipment time or shift hour
  const firstHora = report.atendimentos?.[0]?.horaInicio;
  const greeting = getGreetingForTime(report.shift, firstHora);

  let atendimentosHtml = '';
  if (report.atendimentos && report.atendimentos.length > 0) {
    atendimentosHtml = report.atendimentos.map((at) => `
      <div style="margin-bottom: 8px; page-break-inside: avoid; border: 1px solid #e5e7eb; padding: 6px 10px; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #064e3b; padding-bottom: 3px; margin-bottom: 4px;">
          <h2 style="font-size: 13px; color: #064e3b; margin: 0; font-family: monospace; font-weight: bold;">
            ${at.equipamento}
          </h2>
          <div style="font-size: 10px; color: #4b5563;">
            <strong>OM:</strong> ${at.om || '—'} | <strong>Horímetro:</strong> ${at.horimetro || '—'}
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px;">
          <div>
            <p style="margin: 0 0 1px 0; font-size: 10px; font-weight: bold; color: #374151;">Sintoma:</p>
            <p style="margin: 0; font-size: 10px; color: #4b5563; background-color: #f9fafb; padding: 2px 4px; border-radius: 4px; border-left: 2px solid #10b981;">
              ${at.sintoma || '—'}
            </p>
          </div>
          <div>
            <p style="margin: 0 0 1px 0; font-size: 10px; font-weight: bold; color: #374151;">Causa:</p>
            <p style="margin: 0; font-size: 10px; color: #4b5563; background-color: #f9fafb; padding: 2px 4px; border-radius: 4px; border-left: 2px solid #10b981;">
              ${at.causa || '—'}
            </p>
          </div>
        </div>
        
        <div style="margin-bottom: 4px;">
          <p style="margin: 0 0 1px 0; font-size: 10px; font-weight: bold; color: #374151;">Ação Executada:</p>
          <p style="margin: 0; font-size: 10px; color: #4b5563; background-color: #f9fafb; padding: 2px 4px; border-radius: 4px; border-left: 2px solid #10b981;">
            ${at.acaoExecutada || '—'}
          </p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #374151; margin-top: 3px;">
          <div><strong>Início:</strong> ${at.horaInicio || '—'} | <strong>Fim:</strong> ${at.horaFim || '—'}</div>
          <div><strong>Atuantes:</strong> ${at.atuantes || '—'}</div>
        </div>

        ${((at.photoUrls && at.photoUrls.length > 0) ? at.photoUrls : (at.photoUrl ? [at.photoUrl] : [])).length > 0 ? `
          <div style="margin-top: 4px; text-align: left; display: flex; flex-wrap: wrap; gap: 4px;">
            ${((at.photoUrls && at.photoUrls.length > 0) ? at.photoUrls : (at.photoUrl ? [at.photoUrl] : [])).map((picUrl) => {
              if (picUrl === 'LTM_CACHED_IN_INDEXEDDB_OR_API') {
                return '<div style="font-size: 8px; color: #9ca3af; border: 1px dashed #d1d5db; padding: 4px; border-radius: 4px;">Foto local</div>';
              }
              return `<img src="${picUrl}" style="max-height: 80px; max-width: 80px; border-radius: 4px; border: 1px solid #d1d5db; object-fit: cover;" referrerPolicy="no-referrer" />`;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  } else {
    atendimentosHtml = '<p style="color: #6b7280; font-style: italic; font-size: 11px;">Nenhum atendimento registrado no turno.</p>';
  }

  let pendenciasHtml = '';
  if (report.pendencias && report.pendencias.length > 0) {
    pendenciasHtml = report.pendencias.map((p) => `
      <div style="margin-bottom: 5px; page-break-inside: avoid; background-color: #fffbeb; border: 1px solid #fef3c7; padding: 4px 8px; border-radius: 5px; box-sizing: border-box; font-size: 10px;">
        <strong style="font-family: monospace; color: #92400e;">${p.equipamento}:</strong>
        <span style="color: #78350f; white-space: pre-line;">${p.descricao}</span>
      </div>
    `).join('');
  } else {
    pendenciasHtml = '<p style="color: #6b7280; font-style: italic; font-size: 10px; margin: 0;">Nenhuma pendência registrada.</p>';
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>U&M MINERAÇÃO - RELATÓRIO DE MANUTENÇÃO - ${report.team}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1f2937;
            margin: 15px auto;
            max-width: 740px;
            padding: 0 15px;
            background: #ffffff;
            line-height: 1.35;
          }
          .title-area {
            text-align: center;
            border-bottom: 3px solid #064e3b;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .title-area h1 {
            font-size: 20px;
            margin: 0;
            color: #064e3b;
            font-weight: 800;
            letter-spacing: 0.02em;
          }
          .title-area p {
            margin: 3px 0 0 0;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            color: #4b5563;
          }
          .meta-info {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
          }
          .meta-info table {
            width: 100%;
            border-collapse: collapse;
          }
          .meta-info td {
            padding: 4px 6px;
            font-size: 11px;
          }
          .meta-info td.label {
            font-weight: bold;
            color: #064e3b;
            width: 15%;
          }
          .meta-info td.val {
            color: #111827;
            width: 35%;
          }
          .section-heading {
            font-size: 12px;
            color: #064e3b;
            font-weight: 800;
            margin-top: 10px;
            margin-bottom: 6px;
            text-transform: uppercase;
            border-left: 4px solid #064e3b;
            padding-left: 8px;
          }
          .signature-section {
            margin-top: 25px;
            border-top: 1px solid #d1d5db;
            padding-top: 10px;
            display: flex;
            justify-content: space-around;
            text-align: center;
          }
          .signature-box {
            width: 240px;
          }
          .signature-line {
            border-top: 1px solid #4b5563;
            margin-top: 25px;
            padding-top: 3px;
            font-size: 10px;
            color: #4b5563;
          }
          @media print {
            body { 
              margin: 0 auto !important; 
              padding: 0 !important; 
              font-size: 10px !important;
              max-width: 100% !important;
            }
            .title-area {
              margin-bottom: 8px !important;
              padding-bottom: 4px !important;
            }
            .title-area h1 {
              font-size: 16px !important;
            }
            .meta-info {
              padding: 6px 10px !important;
              margin-bottom: 8px !important;
            }
            .meta-info td {
              padding: 2px 4px !important;
              font-size: 10px !important;
            }
            .section-heading {
              font-size: 10px !important;
              margin-top: 8px !important;
              margin-bottom: 4px !important;
              padding-left: 6px !important;
            }
            .signature-section {
              margin-top: 15px !important;
              padding-top: 6px !important;
            }
            .signature-line {
              margin-top: 18px !important;
            }
            img {
              max-height: 70px !important;
            }
            @page {
              size: portrait;
              margin: 4mm 6mm 4mm 6mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="title-area">
          <h1>RELATÓRIO DE MANUTENÇÃO</h1>
          <p style="letter-spacing: 0.1em; color: #004d2c; font-weight: 900; font-size: 13px; margin-top: 3px;">U&M MINERAÇÃO</p>
        </div>

        <div class="meta-info">
          <table>
            <tr>
              <td class="label">Turma:</td>
              <td class="val">${report.team}</td>
              <td class="label">Horário:</td>
              <td class="val">${report.shift}</td>
            </tr>
            <tr>
              <td class="label">Data:</td>
              <td class="val">${formatDate(report.dateStart)} a ${formatDate(report.dateEnd)}</td>
              <td class="label">Frente:</td>
              <td class="val">FRENTE ${report.frente}</td>
            </tr>
            ${report.tecnicoNome ? `
            <tr>
              <td class="label">${report.tecnicoFuncao || 'Técnico'}:</td>
              <td class="val" colspan="3" style="font-weight: bold; color: #064e3b; text-transform: uppercase;">${report.tecnicoNome}</td>
            </tr>
            ` : `
            ${report.monitor ? `
            <tr>
              <td class="label">Monitor:</td>
              <td class="val" colspan="3" style="font-weight: bold; color: #064e3b; text-transform: uppercase;">${report.monitor}</td>
            </tr>
            ` : ''}
            <tr>
              <td class="label">Eletricista:</td>
              <td class="val">${report.eletricista || 'N/A'}</td>
              <td class="label">Mecânico:</td>
              <td class="val">${report.mecanico || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Auxiliar:</td>
              <td class="val">${report.auxiliar || 'N/A'}</td>
              <td class="label">Motorista:</td>
              <td class="val">${report.motorista || 'N/A'}</td>
            </tr>
            `}
          </table>
        </div>

        <div class="section-heading">Atendimentos Realizados</div>
        <div>
          ${atendimentosHtml}
        </div>

        <div class="section-heading">Pendências</div>
        <div style="margin-bottom: 12px;">
          ${pendenciasHtml}
        </div>

        ${report.observacoesGerais ? `
          <div class="section-heading">Observações Gerais</div>
          <div style="background-color: #f3f4f6; padding: 6px 10px; border-radius: 6px; font-size: 10px; color: #374151; white-space: pre-line; border-left: 3.5px solid #4b5563; margin-bottom: 15px;">
            ${report.observacoesGerais}
          </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Assinatura do Técnico / Responsável</div>
            <strong style="font-size: 10px;">${report.monitor || report.eletricista || report.mecanico || report.auxiliar || report.motorista || 'N/A'}</strong>
          </div>
          <div class="signature-box">
            <div class="signature-line">Assinatura do Supervisor / Validador</div>
            <strong style="font-size: 10px;">Aprovação Digital do Supervisor</strong>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
