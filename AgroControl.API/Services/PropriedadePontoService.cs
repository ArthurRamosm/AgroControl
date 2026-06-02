using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class PropriedadePontoService
{
    private readonly AppDbContext _db;

    public PropriedadePontoService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<PropriedadePontoResponseDto>> ListarAsync(int propriedadeId)
    {
        return await _db.PropriedadePontos
            .Where(p => p.PropriedadeId == propriedadeId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PropriedadePontoResponseDto
            {
                Id = p.Id,
                PropriedadeId = p.PropriedadeId,
                Tipo = p.Tipo,
                Nome = p.Nome,
                Latitude = p.Latitude,
                Longitude = p.Longitude,
                Observacao = p.Observacao,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarAsync(CadastrarPropriedadePontoDto dto)
    {
        var propriedadeExiste = await _db.Propriedades.AnyAsync(p => p.Id == dto.PropriedadeId);
        if (!propriedadeExiste)
            return (false, "Propriedade nao encontrada.", null);

        var tipo = NormalizarTipo(dto.Tipo);
        if (tipo is null)
            return (false, "Tipo de ponto invalido.", null);

        if (dto.Latitude < -90 || dto.Latitude > 90 || dto.Longitude < -180 || dto.Longitude > 180)
            return (false, "Coordenadas do ponto invalidas.", null);

        var ponto = new PropriedadePonto
        {
            PropriedadeId = dto.PropriedadeId,
            Tipo = tipo,
            Nome = dto.Nome.Trim(),
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        };

        _db.PropriedadePontos.Add(ponto);
        await _db.SaveChangesAsync();

        return (true, "Ponto salvo com sucesso!", ponto.Id);
    }

    private static string? NormalizarTipo(string tipo)
    {
        var valor = tipo.Trim().ToUpperInvariant();
        return valor is "NASCENTE" or "POCO" ? valor : null;
    }
}
