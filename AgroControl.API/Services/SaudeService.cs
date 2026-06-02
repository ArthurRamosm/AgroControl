using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class SaudeService
{
    private readonly AppDbContext _db;

    public SaudeService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AnimalSaudeDto>> ListarAsync(int propriedadeId)
    {
        var animais = await _db.Animais
            .Where(a => a.PropriedadeId == propriedadeId)
            .Include(a => a.Vacinas)
            .Include(a => a.SaudeRegistros)
            .OrderBy(a => a.Brinco)
            .ToListAsync();

        return animais.Select(CalcularSaude).ToList();
    }

    public async Task<EstatisticasSaudeDto> EstatisticasAsync(int propriedadeId)
    {
        var agora = DateTime.Now;
        var inicioMes = new DateTime(agora.Year, agora.Month, 1);
        var em30Dias = agora.AddDays(30);

        var vacinasEsteMes = await _db.AnimalVacinas
            .Where(v => v.Animal.PropriedadeId == propriedadeId && v.DataAplicacao >= inicioMes)
            .CountAsync();

        var vermifugacoesEsteMes = await _db.AnimalSaudeRegistros
            .Where(r => r.Animal.PropriedadeId == propriedadeId &&
                        r.TipoRegistro == "Vermifugacao" &&
                        r.DataRegistro >= inicioMes)
            .CountAsync();

        var animaisAfastadosIds = await _db.Afastamentos
            .Where(a => a.PropriedadeId == propriedadeId &&
                        (a.DataRetorno == null || a.DataRetorno > agora))
            .Select(a => a.AnimalId)
            .Distinct()
            .CountAsync();

        var tratamentosAtivos = await _db.Afastamentos
            .Where(a => a.PropriedadeId == propriedadeId &&
                        (a.DataRetorno == null || a.DataRetorno > agora))
            .CountAsync();

        var proximasVacinas = await _db.AnimalVacinas
            .Where(v => v.Animal.PropriedadeId == propriedadeId &&
                        v.ProximaAplicacao != null &&
                        v.ProximaAplicacao > agora &&
                        v.ProximaAplicacao <= em30Dias)
            .CountAsync();

        return new EstatisticasSaudeDto
        {
            VacinasEsteMes = vacinasEsteMes,
            VermifugacoesEsteMes = vermifugacoesEsteMes,
            TratamentosAtivos = tratamentosAtivos,
            AnimaisAfastados = animaisAfastadosIds,
            ProximasVacinas = proximasVacinas
        };
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> RegistrarVacinaAsync(
        int propriedadeId,
        RegistrarVacinaDto dto)
    {
        var animalExiste = await _db.Animais.AnyAsync(a =>
            a.Id == dto.AnimalId && a.PropriedadeId == propriedadeId);

        if (!animalExiste)
            return (false, "Animal nao encontrado ou nao pertence a sua propriedade.", null);

        var vacina = new AnimalVacina
        {
            AnimalId = dto.AnimalId,
            NomeVacina = dto.NomeVacina.Trim(),
            DataAplicacao = dto.DataAplicacao,
            Dose = string.IsNullOrWhiteSpace(dto.Dose) ? null : dto.Dose.Trim(),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim(),
            ProximaAplicacao = dto.ProximaAplicacao
        };

        _db.AnimalVacinas.Add(vacina);
        _db.AnimalSaudeRegistros.Add(new AnimalSaudeRegistro
        {
            AnimalId = dto.AnimalId,
            TipoRegistro = "Vacina",
            DataRegistro = dto.DataAplicacao,
            Descricao = dto.NomeVacina.Trim(),
            ProdutoUtilizado = dto.NomeVacina.Trim(),
            Dose = string.IsNullOrWhiteSpace(dto.Dose) ? null : dto.Dose.Trim(),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim(),
            ProximaAplicacao = dto.ProximaAplicacao
        });

        // Lançar despesa financeira
        if (dto.RegistrarCustoFinanceiro && dto.ValorCusto.HasValue && dto.ValorCusto.Value > 0)
        {
            var animal = await _db.Animais.FindAsync(dto.AnimalId);
            _db.Despesas.Add(new Despesa
            {
                PropriedadeId = propriedadeId,
                AnimalId = dto.AnimalId,
                Categoria = "Medicamentos",
                Descricao = string.IsNullOrWhiteSpace(dto.DescricaoCusto)
                    ? $"Vacina {dto.NomeVacina.Trim()}"
                    : dto.DescricaoCusto.Trim(),
                Valor = dto.ValorCusto.Value,
                DataDespesa = dto.DataAplicacao
            });
        }

        // Descontar do estoque
        if (dto.EstoqueId.HasValue && dto.QuantidadeDescontar.HasValue && dto.QuantidadeDescontar.Value > 0)
        {
            var estoque = await _db.EstoqueMedicamentos
                .FirstOrDefaultAsync(e => e.Id == dto.EstoqueId.Value && e.PropriedadeId == propriedadeId);

            if (estoque is not null && estoque.QuantidadeAtual >= dto.QuantidadeDescontar.Value)
            {
                estoque.QuantidadeAtual -= dto.QuantidadeDescontar.Value;
                estoque.UpdatedAt = DateTime.Now;
                _db.EstoqueMovimentacoes.Add(new EstoqueMovimentacao
                {
                    EstoqueId = estoque.Id,
                    TipoMovimentacao = "saida",
                    Quantidade = dto.QuantidadeDescontar.Value,
                    Motivo = "Aplicacao",
                    AnimalId = dto.AnimalId,
                    DataMovimentacao = dto.DataAplicacao,
                    Observacao = $"Vacina {dto.NomeVacina.Trim()} aplicada automaticamente"
                });
            }
        }

        await _db.SaveChangesAsync();
        return (true, "Vacina registrada com sucesso!", vacina.Id);
    }

    public async Task<List<AnimalSaudeRegistroResponseDto>?> ListarRegistrosAsync(int propriedadeId, int animalId)
    {
        var animalExiste = await _db.Animais.AnyAsync(a => a.Id == animalId && a.PropriedadeId == propriedadeId);
        if (!animalExiste)
            return null;

        return await _db.AnimalSaudeRegistros
            .Where(r => r.AnimalId == animalId)
            .OrderByDescending(r => r.DataRegistro)
            .ThenByDescending(r => r.Id)
            .Select(r => new AnimalSaudeRegistroResponseDto
            {
                Id = r.Id,
                AnimalId = r.AnimalId,
                TipoRegistro = r.TipoRegistro,
                DataRegistro = r.DataRegistro,
                Descricao = r.Descricao,
                ProdutoUtilizado = r.ProdutoUtilizado,
                Dose = r.Dose,
                Veterinario = r.Veterinario,
                ProximaAplicacao = r.ProximaAplicacao,
                Observacao = r.Observacao,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<List<HistoricoVacinaDto>> ObterHistoricoAsync(
        int propriedadeId, DateTime? dataInicio, DateTime? dataFim)
    {
        var query = _db.AnimalVacinas
            .Include(v => v.Animal)
            .Where(v => v.Animal.PropriedadeId == propriedadeId);

        if (dataInicio.HasValue)
            query = query.Where(v => v.DataAplicacao >= dataInicio.Value.Date);

        if (dataFim.HasValue)
            query = query.Where(v => v.DataAplicacao < dataFim.Value.Date.AddDays(1));

        return await query
            .OrderByDescending(v => v.DataAplicacao)
            .Select(v => new HistoricoVacinaDto
            {
                AnimalNome = v.Animal.Nome ?? v.Animal.Brinco,
                AnimalBrinco = v.Animal.Brinco,
                NomeVacina = v.NomeVacina,
                DataAplicacao = v.DataAplicacao,
                Dose = v.Dose,
                Observacao = v.Observacao,
            })
            .ToListAsync();
    }

    public async Task<LoteResultadoDto> RegistrarVacinaLoteAsync(int propriedadeId, LoteVacinaDto dto)
    {
        if (dto.AnimalIds.Count == 0)
            return new LoteResultadoDto { Sucesso = false, Registros = 0, Mensagem = "Nenhum animal selecionado." };

        var idsValidos = await _db.Animais
            .Where(a => dto.AnimalIds.Contains(a.Id) && a.PropriedadeId == propriedadeId)
            .Select(a => a.Id)
            .ToListAsync();

        if (idsValidos.Count == 0)
            return new LoteResultadoDto { Sucesso = false, Registros = 0, Mensagem = "Nenhum animal válido encontrado." };

        var vacinas = idsValidos.Select(id => new AnimalVacina
        {
            AnimalId = id,
            NomeVacina = dto.NomeVacina.Trim(),
            DataAplicacao = dto.DataAplicacao,
            Dose = string.IsNullOrWhiteSpace(dto.Dose) ? null : dto.Dose.Trim(),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        }).ToList();

        var registros = idsValidos.Select(id => new AnimalSaudeRegistro
        {
            AnimalId = id,
            TipoRegistro = "Vacina",
            DataRegistro = dto.DataAplicacao,
            Descricao = dto.NomeVacina.Trim(),
            ProdutoUtilizado = dto.NomeVacina.Trim(),
            Dose = string.IsNullOrWhiteSpace(dto.Dose) ? null : dto.Dose.Trim(),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        }).ToList();

        _db.AnimalVacinas.AddRange(vacinas);
        _db.AnimalSaudeRegistros.AddRange(registros);
        await _db.SaveChangesAsync();

        return new LoteResultadoDto
        {
            Sucesso = true,
            Registros = idsValidos.Count,
            Mensagem = $"Vacina registrada para {idsValidos.Count} animal(is)."
        };
    }

    public async Task<LoteResultadoDto> RegistrarVermifugacaoLoteAsync(int propriedadeId, LoteVermifugacaoDto dto)
    {
        if (dto.AnimalIds.Count == 0)
            return new LoteResultadoDto { Sucesso = false, Registros = 0, Mensagem = "Nenhum animal selecionado." };

        var idsValidos = await _db.Animais
            .Where(a => dto.AnimalIds.Contains(a.Id) && a.PropriedadeId == propriedadeId)
            .Select(a => a.Id)
            .ToListAsync();

        if (idsValidos.Count == 0)
            return new LoteResultadoDto { Sucesso = false, Registros = 0, Mensagem = "Nenhum animal válido encontrado." };

        var registros = idsValidos.Select(id => new AnimalSaudeRegistro
        {
            AnimalId = id,
            TipoRegistro = "Vermifugacao",
            DataRegistro = dto.DataAplicacao,
            Descricao = "Vermifugacao",
            ProdutoUtilizado = dto.ProdutoUtilizado.Trim(),
            Dose = string.IsNullOrWhiteSpace(dto.Dose) ? null : dto.Dose.Trim(),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        }).ToList();

        _db.AnimalSaudeRegistros.AddRange(registros);
        await _db.SaveChangesAsync();

        return new LoteResultadoDto
        {
            Sucesso = true,
            Registros = idsValidos.Count,
            Mensagem = $"Vermifugação registrada para {idsValidos.Count} animal(is)."
        };
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> RegistrarSaudeRegistroAsync(
        int propriedadeId,
        RegistrarSaudeRegistroDto dto)
    {
        var animalExiste = await _db.Animais.AnyAsync(a =>
            a.Id == dto.AnimalId && a.PropriedadeId == propriedadeId);

        if (!animalExiste)
            return (false, "Animal nao encontrado ou nao pertence a sua propriedade.", null);

        var registro = new AnimalSaudeRegistro
        {
            AnimalId = dto.AnimalId,
            TipoRegistro = dto.TipoRegistro.Trim(),
            DataRegistro = dto.DataRegistro,
            Descricao = string.IsNullOrWhiteSpace(dto.Descricao) ? null : dto.Descricao.Trim(),
            ProdutoUtilizado = string.IsNullOrWhiteSpace(dto.ProdutoUtilizado) ? null : dto.ProdutoUtilizado.Trim(),
            Dose = string.IsNullOrWhiteSpace(dto.Dose) ? null : dto.Dose.Trim(),
            Veterinario = string.IsNullOrWhiteSpace(dto.Veterinario) ? null : dto.Veterinario.Trim(),
            ProximaAplicacao = dto.ProximaAplicacao,
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        };

        _db.AnimalSaudeRegistros.Add(registro);

        // Lançar despesa financeira
        if (dto.RegistrarCustoFinanceiro && dto.ValorCusto.HasValue && dto.ValorCusto.Value > 0)
        {
            _db.Despesas.Add(new Despesa
            {
                PropriedadeId = propriedadeId,
                AnimalId = dto.AnimalId,
                Categoria = "Medicamentos",
                Descricao = string.IsNullOrWhiteSpace(dto.DescricaoCusto)
                    ? $"{dto.TipoRegistro.Trim()} — {dto.ProdutoUtilizado?.Trim() ?? dto.Descricao?.Trim()}"
                    : dto.DescricaoCusto.Trim(),
                Valor = dto.ValorCusto.Value,
                DataDespesa = dto.DataRegistro
            });
        }

        // Descontar do estoque
        if (dto.EstoqueId.HasValue && dto.QuantidadeDescontar.HasValue && dto.QuantidadeDescontar.Value > 0)
        {
            var estoque = await _db.EstoqueMedicamentos
                .FirstOrDefaultAsync(e => e.Id == dto.EstoqueId.Value && e.PropriedadeId == propriedadeId);

            if (estoque is not null && estoque.QuantidadeAtual >= dto.QuantidadeDescontar.Value)
            {
                estoque.QuantidadeAtual -= dto.QuantidadeDescontar.Value;
                estoque.UpdatedAt = DateTime.Now;
                _db.EstoqueMovimentacoes.Add(new EstoqueMovimentacao
                {
                    EstoqueId = estoque.Id,
                    TipoMovimentacao = "saida",
                    Quantidade = dto.QuantidadeDescontar.Value,
                    Motivo = "Aplicacao",
                    AnimalId = dto.AnimalId,
                    DataMovimentacao = dto.DataRegistro,
                    Observacao = $"{dto.TipoRegistro.Trim()} aplicada automaticamente"
                });
            }
        }

        await _db.SaveChangesAsync();
        return (true, "Registro de saude cadastrado com sucesso!", registro.Id);
    }

    private AnimalSaudeDto CalcularSaude(Animal animal)
    {
        var hoje = DateTime.Today;
        var idadeMeses = ObterIdadeMeses(animal, hoje);
        var pendentes = new List<string>();
        var atrasadas = new List<string>();
        var alertasVermifugacao = ObterAlertasVermifugacao(animal, hoje);

        if (animal.Sexo == "F" && idadeMeses is >= 5 and <= 8 && !TemVacina(animal, "brucelose"))
            pendentes.Add("Brucelose");

        if (animal.Sexo == "F" && idadeMeses > 8 && !TemVacina(animal, "brucelose"))
            atrasadas.Add("Brucelose");

        if (hoje.Month == 5 && !TemVacinaNoAnoMes(animal, "febre aftosa", hoje.Year, 5))
            pendentes.Add("Febre Aftosa - Maio");

        if (hoje.Month == 11 && idadeMeses <= 24 && !TemVacinaNoAnoMes(animal, "febre aftosa", hoje.Year, 11))
            pendentes.Add("Febre Aftosa - Novembro");

        if (idadeMeses >= 4 && !TemVacinaNoAno(animal, "raiva", hoje.Year))
            pendentes.Add("Raiva");

        var status = atrasadas.Count > 0 || alertasVermifugacao.Any(a => a.Contains("vencida"))
            ? "Atrasada"
            : pendentes.Count > 0 || alertasVermifugacao.Count > 0
                ? "Pendente"
                : "Em dia";

        return new AnimalSaudeDto
        {
            AnimalId = animal.Id,
            Brinco = animal.Brinco,
            Nome = animal.Nome,
            Sexo = animal.Sexo,
            Tipo = animal.Tipo,
            Raca = animal.Raca,
            Idade = FormatarIdade(animal, hoje),
            IdadeMeses = idadeMeses,
            Status = status,
            VacinasPendentes = pendentes,
            VacinasAtrasadas = atrasadas,
            AlertasVermifugacao = alertasVermifugacao
        };
    }

    private static List<string> ObterAlertasVermifugacao(Animal animal, DateTime hoje)
    {
        var proxima = animal.SaudeRegistros
            .Where(r => Normalizar(r.TipoRegistro).Contains("vermifug") && r.ProximaAplicacao != null)
            .OrderByDescending(r => r.ProximaAplicacao)
            .FirstOrDefault();

        if (proxima?.ProximaAplicacao is null)
            return new List<string>();

        var dias = (proxima.ProximaAplicacao.Value.Date - hoje).Days;
        if (dias < 0)
            return new List<string> { $"Vermifugacao vencida em {proxima.ProximaAplicacao.Value:dd/MM/yyyy}" };

        if (dias <= 15)
            return new List<string> { $"Vermifugacao proxima em {proxima.ProximaAplicacao.Value:dd/MM/yyyy}" };

        return new List<string>();
    }

    private static bool TemVacina(Animal animal, string nome) =>
        animal.Vacinas.Any(v => Normalizar(v.NomeVacina).Contains(Normalizar(nome)));

    private static bool TemVacinaNoAno(Animal animal, string nome, int ano) =>
        animal.Vacinas.Any(v =>
            Normalizar(v.NomeVacina).Contains(Normalizar(nome)) &&
            v.DataAplicacao.Year == ano);

    private static bool TemVacinaNoAnoMes(Animal animal, string nome, int ano, int mes) =>
        animal.Vacinas.Any(v =>
            Normalizar(v.NomeVacina).Contains(Normalizar(nome)) &&
            v.DataAplicacao.Year == ano &&
            v.DataAplicacao.Month == mes);

    private static int? ObterIdadeMeses(Animal animal, DateTime hoje)
    {
        var data = ObterDataNascimento(animal);
        if (data is null)
        {
            if (ObterAnoNascimento(animal) is int ano)
                return Math.Max(0, (hoje.Year - ano) * 12);
            return null;
        }

        var meses = (hoje.Year - data.Value.Year) * 12 + hoje.Month - data.Value.Month;
        if (hoje.Day < data.Value.Day)
            meses--;

        return Math.Max(0, meses);
    }

    private static string FormatarIdade(Animal animal, DateTime hoje)
    {
        var data = ObterDataNascimento(animal);
        if (data is not null)
        {
            var meses = ObterIdadeMeses(animal, hoje) ?? 0;
            var anos = meses / 12;
            var restoMeses = meses % 12;
            if (anos <= 0)
                return $"{restoMeses} meses";
            if (restoMeses == 0)
                return $"{anos} anos";
            return $"{anos} anos e {restoMeses} meses";
        }

        if (ObterAnoNascimento(animal) is int anoNascimento)
        {
            var anos = Math.Max(0, hoje.Year - anoNascimento);
            return $"aprox. {anos} anos";
        }

        return "Nao informada";
    }

    private static DateTime? ObterDataNascimento(Animal animal)
    {
        var informada = animal.DataNascimentoInformada;
        if (!string.IsNullOrWhiteSpace(informada) &&
            DateTime.TryParseExact(informada, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dataInformada))
            return dataInformada;

        return animal.DataNascimento;
    }

    private static int? ObterAnoNascimento(Animal animal)
    {
        var informada = animal.DataNascimentoInformada;
        if (!string.IsNullOrWhiteSpace(informada) &&
            int.TryParse(informada, out var ano) &&
            informada.Length == 4)
            return ano;

        return null;
    }

    private static string Normalizar(string valor)
    {
        var texto = valor.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        return new string(texto.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
    }
}
