using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class DashboardService(AppDbContext db)
{
    private readonly AppDbContext _db = db;

    public async Task<DashboardResponseDto> ObterAsync(int propriedadeId)
    {
        var hoje = DateTime.Today;
        var umAnoAtras = hoje.AddYears(-1);

        await GerarAlertasAutomaticosAsync(propriedadeId, hoje);

        var prop = await _db.Propriedades
            .Where(p => p.Id == propriedadeId)
            .Select(p => new { p.FocoProdutivo })
            .FirstOrDefaultAsync();

        var focoProdutivo = prop?.FocoProdutivo ?? "ambos";

        var totalAnimais = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId && a.Ativo);

        var afastadosIds = await _db.Afastamentos
            .Where(a => a.PropriedadeId == propriedadeId
                     && (a.DataRetorno == null || a.DataRetorno > hoje))
            .Select(a => a.AnimalId)
            .Distinct()
            .ToListAsync();

        var saudaveis = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId
                          && a.Ativo
                          && !afastadosIds.Contains(a.Id));

        var produzindo = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId
                          && a.Ativo
                          && a.StatusLeite != null
                          && a.StatusLeite.ToLower() == "produzindo");

        var emEngorda = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId
                          && a.Ativo
                          && (a.Tipo == "Novilho" || a.Tipo == "Novilha"));

        var vacinasPendentes = await _db.AnimalSaudeRegistros
            .CountAsync(r => r.Animal.PropriedadeId == propriedadeId
                          && r.ProximaAplicacao != null
                          && r.ProximaAplicacao < hoje);

        var alertasNaoLidos = await _db.Alertas
            .CountAsync(a => a.PropriedadeId == propriedadeId && !a.Lido);

        var machos = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId && a.Ativo && a.Sexo == "M");

        var femeas = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId && a.Ativo && a.Sexo == "F");

        var bezzerrosMachos = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId
                          && a.Ativo
                          && a.Sexo == "M"
                          && a.DataNascimento != null
                          && a.DataNascimento > umAnoAtras);

        var bezzerrosFemeas = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId
                          && a.Ativo
                          && a.Sexo == "F"
                          && a.DataNascimento != null
                          && a.DataNascimento > umAnoAtras);

        var matrizes = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId
                          && a.Ativo
                          && a.Sexo == "F"
                          && (a.DataNascimento == null || a.DataNascimento <= umAnoAtras));

        var reprodutores = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId
                          && a.Ativo
                          && a.Tipo.ToLower() == "reprodutor");

        return new DashboardResponseDto
        {
            TotalAnimais = totalAnimais,
            Saudaveis = saudaveis,
            VacinasPendentes = vacinasPendentes,
            Produzindo = produzindo,
            EmEngorda = emEngorda,
            AlertasNaoLidos = alertasNaoLidos,
            FocoProdutivo = focoProdutivo,
            ResumoRebanho = new ResumoRebanhoDto
            {
                Machos = machos,
                Femeas = femeas,
                BezzerrosMachos = bezzerrosMachos,
                BezzerrosFemeas = bezzerrosFemeas,
                Matrizes = matrizes,
                Reprodutores = reprodutores,
            },
        };
    }

    private async Task GerarAlertasAutomaticosAsync(int propriedadeId, DateTime hoje)
    {
        var chaves = (await _db.Alertas
            .Where(a => a.PropriedadeId == propriedadeId && a.DataAlerta >= hoje.AddDays(-1))
            .Select(a => new { a.Tipo, a.AnimalId, a.DataAlerta })
            .ToListAsync())
            .Select(a => $"{a.Tipo}|{a.AnimalId}|{a.DataAlerta.Date:yyyy-MM-dd}")
            .ToHashSet();

        var novos = new List<Alerta>();

        var vacinasAtrasadas = await _db.AnimalSaudeRegistros
            .Where(r => r.Animal.PropriedadeId == propriedadeId
                     && r.ProximaAplicacao != null
                     && r.ProximaAplicacao < hoje)
            .Select(r => new { r.AnimalId, r.TipoRegistro, r.Descricao, r.ProdutoUtilizado })
            .ToListAsync();

        foreach (var v in vacinasAtrasadas)
        {
            var chave = $"Vacinacao|{v.AnimalId}|{hoje:yyyy-MM-dd}";
            if (chaves.Contains(chave)) continue;
            var desc = v.Descricao ?? v.ProdutoUtilizado ?? v.TipoRegistro;
            novos.Add(new Alerta
            {
                PropriedadeId = propriedadeId,
                AnimalId = v.AnimalId,
                Tipo = "Vacinacao",
                Descricao = $"Vacina/tratamento atrasado: {desc}",
                DataAlerta = hoje,
                Lido = false,
                CreatedAt = DateTime.Now,
            });
            chaves.Add(chave);
        }

        var partos = await _db.AnimalReproducoes
            .Where(r => r.Animal.PropriedadeId == propriedadeId
                     && r.PrevisaoParto != null
                     && r.PrevisaoParto >= hoje
                     && r.PrevisaoParto <= hoje.AddDays(7))
            .Select(r => new { r.AnimalId, r.PrevisaoParto })
            .ToListAsync();

        foreach (var p in partos)
        {
            var dataParto = p.PrevisaoParto!.Value.Date;
            var chave = $"Parto|{p.AnimalId}|{dataParto:yyyy-MM-dd}";
            if (chaves.Contains(chave)) continue;
            novos.Add(new Alerta
            {
                PropriedadeId = propriedadeId,
                AnimalId = p.AnimalId,
                Tipo = "Parto",
                Descricao = $"Parto previsto para {dataParto:dd/MM/yyyy}",
                DataAlerta = dataParto,
                Lido = false,
                CreatedAt = DateTime.Now,
            });
            chaves.Add(chave);
        }

        var retornos = await _db.Afastamentos
            .Where(a => a.PropriedadeId == propriedadeId
                     && a.DataRetorno != null
                     && a.DataRetorno.Value.Date == hoje)
            .Select(a => new { a.AnimalId, a.MotivoAfastamento })
            .ToListAsync();

        foreach (var af in retornos)
        {
            var chave = $"Afastamento|{af.AnimalId}|{hoje:yyyy-MM-dd}";
            if (chaves.Contains(chave)) continue;
            novos.Add(new Alerta
            {
                PropriedadeId = propriedadeId,
                AnimalId = af.AnimalId,
                Tipo = "Afastamento",
                Descricao = $"Retorno do afastamento hoje: {af.MotivoAfastamento}",
                DataAlerta = hoje,
                Lido = false,
                CreatedAt = DateTime.Now,
            });
            chaves.Add(chave);
        }

        if (novos.Count > 0)
        {
            _db.Alertas.AddRange(novos);
            await _db.SaveChangesAsync();
        }
    }
}
