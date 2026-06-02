using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;

namespace AgroControl.API.Services;

public class AlertaService(AppDbContext db)
{
    private readonly AppDbContext _db = db;

    public async Task<List<AlertaResponseDto>> ListarAsync(int propriedadeId)
    {
        return await _db.Alertas
            .Include(a => a.Animal)
            .Where(a => a.PropriedadeId == propriedadeId)
            .OrderBy(a => a.Lido)
            .ThenByDescending(a => a.DataAlerta)
            .Take(10)
            .Select(a => new AlertaResponseDto
            {
                Id = a.Id,
                AnimalId = a.AnimalId,
                AnimalNome = a.Animal != null ? a.Animal.Nome : null,
                AnimalBrinco = a.Animal != null ? a.Animal.Brinco : null,
                Tipo = a.Tipo,
                Descricao = a.Descricao,
                DataAlerta = a.DataAlerta,
                Lido = a.Lido,
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem)> MarcarLidoAsync(int id, int propriedadeId)
    {
        var alerta = await _db.Alertas
            .FirstOrDefaultAsync(a => a.Id == id && a.PropriedadeId == propriedadeId);
        if (alerta is null)
            return (false, "Alerta não encontrado.");

        alerta.Lido = true;
        await _db.SaveChangesAsync();
        return (true, "Alerta marcado como lido.");
    }
}
