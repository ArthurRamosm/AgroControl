using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class PropriedadeAreaService
{
    private readonly AppDbContext _db;

    public PropriedadeAreaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<PropriedadeAreaResponseDto>> ListarAsync(int propriedadeId)
    {
        return await _db.PropriedadeAreas
            .Where(a => a.PropriedadeId == propriedadeId)
            .OrderBy(a => a.TipoCadastro == "AREA_TOTAL" ? 0 : 1)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new PropriedadeAreaResponseDto
            {
                Id = a.Id,
                PropriedadeId = a.PropriedadeId,
                TipoCadastro = a.TipoCadastro,
                AreaPaiId = a.AreaPaiId,
                Nome = a.Nome,
                TipoArea = a.TipoArea,
                Cor = a.Cor,
                Observacao = a.Observacao,
                CoordenadasGeojson = a.CoordenadasGeojson,
                AreaHectares = a.AreaHectares,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarAsync(CadastrarPropriedadeAreaDto dto)
    {
        var propriedadeExiste = await _db.Propriedades.AnyAsync(p => p.Id == dto.PropriedadeId);
        if (!propriedadeExiste)
            return (false, "Propriedade nao encontrada.", null);

        if (string.IsNullOrWhiteSpace(dto.CoordenadasGeojson))
            return (false, "Desenhe uma area antes de salvar.", null);

        var tipoCadastro = NormalizarTipoCadastro(dto.TipoCadastro);
        if (tipoCadastro is null)
            return (false, "Tipo de cadastro da area invalido.", null);

        var areaTotal = await _db.PropriedadeAreas
            .FirstOrDefaultAsync(a => a.PropriedadeId == dto.PropriedadeId && a.TipoCadastro == "AREA_TOTAL");

        if (tipoCadastro == "AREA_TOTAL" && areaTotal is not null)
            return (false, "Esta propriedade ja possui uma Area Total cadastrada.", null);

        if (tipoCadastro == "AREA_INTERNA")
        {
            if (areaTotal is null)
                return (false, "Cadastre primeiro a Area Total da Fazenda.", null);

            if (dto.AreaPaiId.HasValue && dto.AreaPaiId.Value != areaTotal.Id)
                return (false, "A area interna deve estar ligada a Area Total da mesma propriedade.", null);
        }

        var area = new PropriedadeArea
        {
            PropriedadeId = dto.PropriedadeId,
            TipoCadastro = tipoCadastro,
            AreaPaiId = tipoCadastro == "AREA_INTERNA" ? areaTotal?.Id : null,
            Nome = dto.Nome.Trim(),
            TipoArea = tipoCadastro == "AREA_TOTAL" ? "Area Total" : dto.TipoArea.Trim(),
            Cor = NormalizarCor(dto.Cor, tipoCadastro, dto.TipoArea),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim(),
            CoordenadasGeojson = dto.CoordenadasGeojson,
            AreaHectares = dto.AreaHectares
        };

        _db.PropriedadeAreas.Add(area);
        await _db.SaveChangesAsync();

        return (true, "Area salva com sucesso!", area.Id);
    }

    private static string? NormalizarTipoCadastro(string? tipoCadastro)
    {
        var valor = string.IsNullOrWhiteSpace(tipoCadastro)
            ? "AREA_INTERNA"
            : tipoCadastro.Trim().ToUpperInvariant();

        return valor is "AREA_TOTAL" or "AREA_INTERNA" ? valor : null;
    }

    private static string NormalizarCor(string? cor, string tipoCadastro, string tipoArea)
    {
        var valor = string.IsNullOrWhiteSpace(cor) ? CorPadrao(tipoCadastro, tipoArea) : cor.Trim();
        return valor.StartsWith("#") && valor.Length == 7 ? valor : CorPadrao(tipoCadastro, tipoArea);
    }

    private static string CorPadrao(string tipoCadastro, string tipoArea)
    {
        if (tipoCadastro == "AREA_TOTAL") return "#8fd19e";

        return tipoArea.Trim() switch
        {
            "Pasto" => "#35a853",
            "Piquete" => "#1f7a3a",
            "Curral" => "#8b5a2b",
            "Reserva" => "#14532d",
            "Plantio" => "#d9a420",
            _ => "#7b8794"
        };
    }
}
