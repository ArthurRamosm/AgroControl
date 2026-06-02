using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class AnimalFichaService
{
    private readonly AppDbContext _db;

    public AnimalFichaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AnimalEventoResponseDto>?> ListarEventosAsync(int animalId, int propriedadeId)
    {
        if (!await AnimalPertenceAPropriedadeAsync(animalId, propriedadeId))
            return null;

        return await _db.AnimalEventos
            .Where(e => e.AnimalId == animalId)
            .OrderByDescending(e => e.DataEvento)
            .ThenByDescending(e => e.Id)
            .Select(e => new AnimalEventoResponseDto
            {
                Id = e.Id,
                AnimalId = e.AnimalId,
                TipoEvento = e.TipoEvento,
                DataEvento = e.DataEvento,
                PesoKg = e.PesoKg,
                RacaoKgDia = e.RacaoKgDia,
                LeiteLitrosDia = e.LeiteLitrosDia,
                Observacao = e.Observacao,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarEventoAsync(
        int animalId,
        int propriedadeId,
        CadastrarAnimalEventoDto dto)
    {
        if (!await AnimalPertenceAPropriedadeAsync(animalId, propriedadeId))
            return (false, "Animal nao encontrado ou nao pertence a sua propriedade.", null);

        var evento = new AnimalEvento
        {
            AnimalId = animalId,
            TipoEvento = dto.TipoEvento.Trim(),
            DataEvento = dto.DataEvento,
            PesoKg = dto.PesoKg,
            RacaoKgDia = dto.RacaoKgDia,
            LeiteLitrosDia = dto.LeiteLitrosDia,
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        };

        _db.AnimalEventos.Add(evento);
        await _db.SaveChangesAsync();

        return (true, "Evento cadastrado com sucesso!", evento.Id);
    }

    public async Task<List<AnimalLactacaoResponseDto>?> ListarLactacoesAsync(int animalId, int propriedadeId)
    {
        if (!await AnimalPertenceAPropriedadeAsync(animalId, propriedadeId))
            return null;

        return await _db.AnimalLactacoes
            .Where(l => l.AnimalId == animalId)
            .OrderByDescending(l => l.NumeroLactacao)
            .ThenByDescending(l => l.Id)
            .Select(l => new AnimalLactacaoResponseDto
            {
                Id = l.Id,
                AnimalId = l.AnimalId,
                NumeroLactacao = l.NumeroLactacao,
                DataParto = l.DataParto,
                InicioControle = l.InicioControle,
                DataSecagem = l.DataSecagem,
                DiasLactacao = l.DiasLactacao,
                ProducaoTotal = l.ProducaoTotal,
                MediaDiaria = l.MediaDiaria,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarLactacaoAsync(
        int animalId,
        int propriedadeId,
        CadastrarAnimalLactacaoDto dto)
    {
        if (!await AnimalPertenceAPropriedadeAsync(animalId, propriedadeId))
            return (false, "Animal nao encontrado ou nao pertence a sua propriedade.", null);

        var lactacao = new AnimalLactacao
        {
            AnimalId = animalId,
            NumeroLactacao = dto.NumeroLactacao,
            DataParto = dto.DataParto,
            InicioControle = dto.InicioControle,
            DataSecagem = dto.DataSecagem,
            DiasLactacao = dto.DiasLactacao,
            ProducaoTotal = dto.ProducaoTotal,
            MediaDiaria = dto.MediaDiaria
        };

        _db.AnimalLactacoes.Add(lactacao);
        await _db.SaveChangesAsync();

        return (true, "Lactacao cadastrada com sucesso!", lactacao.Id);
    }

    public async Task<List<AnimalReproducaoResponseDto>?> ListarReproducoesAsync(int animalId, int propriedadeId)
    {
        if (!await AnimalPertenceAPropriedadeAsync(animalId, propriedadeId))
            return null;

        return await _db.AnimalReproducoes
            .Where(r => r.AnimalId == animalId)
            .OrderByDescending(r => r.DataEvento)
            .ThenByDescending(r => r.Id)
            .Select(r => new AnimalReproducaoResponseDto
            {
                Id = r.Id,
                AnimalId = r.AnimalId,
                TipoEvento = r.TipoEvento,
                DataEvento = r.DataEvento,
                Reprodutor = r.Reprodutor,
                Inseminador = r.Inseminador,
                PrevisaoParto = r.PrevisaoParto,
                Resultado = r.Resultado,
                Observacao = r.Observacao,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarReproducaoAsync(
        int animalId,
        int propriedadeId,
        CadastrarAnimalReproducaoDto dto)
    {
        if (!await AnimalPertenceAPropriedadeAsync(animalId, propriedadeId))
            return (false, "Animal nao encontrado ou nao pertence a sua propriedade.", null);

        var reproducao = new AnimalReproducao
        {
            AnimalId = animalId,
            TipoEvento = dto.TipoEvento.Trim(),
            DataEvento = dto.DataEvento,
            Reprodutor = string.IsNullOrWhiteSpace(dto.Reprodutor) ? null : dto.Reprodutor.Trim(),
            Inseminador = string.IsNullOrWhiteSpace(dto.Inseminador) ? null : dto.Inseminador.Trim(),
            PrevisaoParto = dto.PrevisaoParto,
            Resultado = string.IsNullOrWhiteSpace(dto.Resultado) ? null : dto.Resultado.Trim(),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        };

        _db.AnimalReproducoes.Add(reproducao);
        await _db.SaveChangesAsync();

        return (true, "Evento reprodutivo cadastrado com sucesso!", reproducao.Id);
    }

    private Task<bool> AnimalPertenceAPropriedadeAsync(int animalId, int propriedadeId)
    {
        return _db.Animais.AnyAsync(a => a.Id == animalId && a.PropriedadeId == propriedadeId);
    }
}
