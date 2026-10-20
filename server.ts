import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const DB_FILE = path.join(process.cwd(), "reports_db.json");
const TECNICOS_FILE = path.join(process.cwd(), "tecnicos_db.json");

// Helper to load reports from storage
function loadReports(): any[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Erro ao ler banco de dados de relatorios:", err);
  }
  return [];
}

// Helper to save reports to storage
function saveReports(reports: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(reports, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao gravar banco de dados de relatorios:", err);
  }
}

// Helper to load tecnicos from storage
function loadTecnicos(): any[] {
  try {
    if (fs.existsSync(TECNICOS_FILE)) {
      const data = fs.readFileSync(TECNICOS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Erro ao ler banco de dados de tecnicos:", err);
  }
  return [];
}

// Helper to save tecnicos to storage
function saveTecnicos(tecnicos: any[]) {
  try {
    fs.writeFileSync(TECNICOS_FILE, JSON.stringify(tecnicos, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao gravar banco de dados de tecnicos:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to support large JSON payloads (since photos are stored as base64 within the report)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: get all reports
  app.get("/api/reports", (req, res) => {
    const list = loadReports();
    res.json(list);
  });

  // API Route: clear all reports from database
  app.post("/api/reports/clear", (req, res) => {
    saveReports([]);
    res.json({ success: true, count: 0 });
  });

  // API Route: save or update a report
  app.post("/api/reports", (req, res) => {
    const updatedReport = req.body;
    if (!updatedReport || !updatedReport.id) {
       res.status(400).json({ error: "Relatorio invalido (falta id)" });
       return;
    }

    const currentList = loadReports();
    const existsIdx = currentList.findIndex((r: any) => r.id === updatedReport.id);
    if (existsIdx >= 0) {
      currentList[existsIdx] = updatedReport;
    } else {
      currentList.unshift(updatedReport); // Add to the top
    }

    // Sort by createdAt desc
    currentList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    saveReports(currentList);
    res.json({ success: true, report: updatedReport });
  });

  // API Route: bulk save reports (e.g. initial load / sync)
  app.post("/api/reports/bulk", (req, res) => {
    const bulkList = req.body;
    if (!Array.isArray(bulkList)) {
       res.status(400).json({ error: "Corpo do request deve ser um array" });
       return;
    }

    const currentList = loadReports();
    // Merge list: keep existing on system, overwrite if incoming is newer, or add if absent
    const reportMap = new Map<string, any>();
    currentList.forEach((r) => reportMap.set(r.id, r));
    bulkList.forEach((r) => {
      if (r && r.id) {
        const existing = reportMap.get(r.id);
        if (!existing || new Date(r.createdAt || 0) > new Date(existing.createdAt || 0)) {
          reportMap.set(r.id, r);
        }
      }
    });

    const merged = Array.from(reportMap.values());
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    saveReports(merged);
    res.json({ success: true, count: merged.length });
  });

  // API Route: delete report
  app.delete("/api/reports/:id", (req, res) => {
    const reportId = req.params.id;
    const currentList = loadReports();
    const filtered = currentList.filter((r: any) => r.id !== reportId);
    saveReports(filtered);
    res.json({ success: true, id: reportId });
  });

  // API Route: get all tecnicos
  app.get("/api/tecnicos", (req, res) => {
    const list = loadTecnicos();
    res.json(list);
  });

  // API Route: clear all tecnicos
  app.post("/api/tecnicos/clear", (req, res) => {
    saveTecnicos([]);
    res.json({ success: true, count: 0 });
  });

  // API Route: save or update a tecnico
  app.post("/api/tecnicos", (req, res) => {
    const tecnico = req.body;
    if (!tecnico || !tecnico.id || !tecnico.nome) {
      res.status(400).json({ error: "Técnico inválido (nome e id são obrigatórios)" });
      return;
    }

    const currentList = loadTecnicos();
    const existsIdx = currentList.findIndex((t: any) => t.id === tecnico.id);
    if (existsIdx >= 0) {
      currentList[existsIdx] = tecnico;
    } else {
      currentList.push(tecnico);
    }

    // Sort by name
    currentList.sort((a, b) => a.nome.localeCompare(b.nome));
    saveTecnicos(currentList);
    res.json({ success: true, tecnico });
  });

  // API Route: bulk save tecnicos
  app.post("/api/tecnicos/bulk", (req, res) => {
    const bulkList = req.body;
    if (!Array.isArray(bulkList)) {
      res.status(400).json({ error: "Corpo do request deve ser um array" });
      return;
    }

    const currentList = loadTecnicos();
    const map = new Map<string, any>();
    currentList.forEach(t => map.set(t.id, t));
    bulkList.forEach(t => {
      if (t && t.id) {
        map.set(t.id, t);
      }
    });

    const merged = Array.from(map.values());
    merged.sort((a, b) => a.nome.localeCompare(b.nome));
    saveTecnicos(merged);
    res.json({ success: true, count: merged.length });
  });

  // API Route: delete tecnico
  app.delete("/api/tecnicos/:id", (req, res) => {
    const tecnicoId = req.params.id;
    const currentList = loadTecnicos();
    const filtered = currentList.filter((t: any) => t.id !== tecnicoId);
    saveTecnicos(filtered);
    res.json({ success: true, id: tecnicoId });
  });

  // API Route: 404 for unmatched /api routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      sucesso: false,
      erro: "Rota da API não encontrada.",
      caminho: req.originalUrl
    });
  });

  // Global Express Error Middleware: always responds in JSON with clear Portuguese messages
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Erro interno do servidor Express U&M:", err);
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({
      sucesso: false,
      erro: err.message || "Ocorreu um erro interno no servidor.",
      detalhes: process.env.NODE_ENV !== "production" ? String(err.stack || err) : undefined
    });
  });

  // Vite middleware for development loading
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
