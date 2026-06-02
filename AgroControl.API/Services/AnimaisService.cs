using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class AnimaisService
{
    private readonly AppDbContext _db;

    public AnimaisService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AnimalResponseDto>> ListarAsync(
        int propriedadeId,
        string? busca = null,
        bool? ativo = null,
        bool? vendido = null,
        bool? doente = null)
    {
        var query = _db.Animais.Where(a => a.PropriedadeId == propriedadeId);

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var termo = busca.Trim().ToLower();
            query = query.Where(a =>
                (a.Nome != null && a.Nome.ToLower().Contains(termo)) ||
                a.Brinco.ToLower().Contains(termo));
        }

        if (ativo.HasValue)
            query = query.Where(a => a.Ativo == ativo.Value);

        if (vendido == true)
            query = query.Where(a =>
                !a.Ativo &&
                a.MotivoSaida != null &&
                a.MotivoSaida.ToLower().Contains("venda"));

        if (doente == true)
        {
            var agora = DateTime.Now;
            query = query.Where(a =>
                _db.Afastamentos.Any(af =>
                    af.AnimalId == a.Id &&
                    af.PropriedadeId == propriedadeId &&
                    (af.DataRetorno == null || af.DataRetorno > agora)));
        }

        return await query
            .Select(a => new AnimalResponseDto
            {
                Id = a.Id,
                Brinco = a.Brinco,
                Nome = a.Nome,
                Raca = a.Raca,
                Raca2 = a.Raca2,
                Sexo = a.Sexo,
                Tipo = a.Tipo,
                StatusLeite = a.StatusLeite,
                Ativo = a.Ativo,
                NumeroAnimal = a.NumeroAnimal,
                DataNascimento = a.DataNascimento,
                DataNascimentoInformada = a.DataNascimentoInformada,
                PaiAnimalId = a.PaiAnimalId,
                NomePai = a.NomePai,
                RacaPai = a.RacaPai,
                MaeAnimalId = a.MaeAnimalId,
                NomeMae = a.NomeMae,
                RacaMae = a.RacaMae,
                Procedencia = a.Procedencia,
                DataEntrada = a.DataEntrada,
                DataEntradaInformada = a.DataEntradaInformada,
                DataSaida = a.DataSaida,
                DataSaidaInformada = a.DataSaidaInformada,
                Valor = a.Valor,
                MotivoSaida = a.MotivoSaida,
                MarcaSinal = a.MarcaSinal,
                Observacao = a.Observacao,
                Fotos = a.Fotos
                    .OrderBy(f => f.Ordem)
                    .Select(f => new AnimalFotoDto
                    {
                        Id = f.Id,
                        AnimalId = f.AnimalId,
                        FotoBase64 = f.FotoBase64,
                        Ordem = f.Ordem,
                        CreatedAt = f.CreatedAt
                    })
                    .ToList()
            })
            .ToListAsync();
    }

    public async Task<AnimalFiliacaoBuscaDto?> BuscarFiliacaoAsync(int propriedadeId, string termo, int? ignorarAnimalId = null)
    {
        var termoNormalizado = termo.Trim().ToUpper();
        if (string.IsNullOrWhiteSpace(termoNormalizado))
            return null;

        return await _db.Animais
            .Where(a => a.PropriedadeId == propriedadeId)
            .Where(a => ignorarAnimalId == null || a.Id != ignorarAnimalId.Value)
            .Where(a => a.Brinco.ToUpper() == termoNormalizado)
            .Select(a => new AnimalFiliacaoBuscaDto
            {
                Id = a.Id,
                Brinco = a.Brinco,
                NumeroAnimal = a.NumeroAnimal,
                Nome = a.Nome,
                Raca = a.Raca,
                Sexo = a.Sexo
            })
            .FirstOrDefaultAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarAsync(CadastrarAnimalDto dto)
    {
        var brincoExiste = await _db.Animais.AnyAsync(a =>
            a.Brinco == dto.Brinco.ToUpper() &&
            a.PropriedadeId == dto.PropriedadeId &&
            a.Ativo == true);
        if (brincoExiste)
            return (false, $"Já existe um animal ativo com o brinco {dto.Brinco.ToUpper()} nesta propriedade.", null);
        if (dto.Fotos.Count > 3)
            return (false, "Cada animal pode ter no máximo 3 fotos.", null);

        var animal = new Animal
        {
            Brinco = dto.Brinco.ToUpper(),
            Nome = string.IsNullOrWhiteSpace(dto.Nome) ? null : dto.Nome.Trim(),
            Raca = dto.Raca.Trim(),
            Raca2 = string.IsNullOrWhiteSpace(dto.Raca2) ? null : dto.Raca2.Trim(),
            Sexo = dto.Sexo,
            Tipo = dto.Tipo.Trim(),
            StatusLeite = dto.Sexo == "F" ? dto.StatusLeite : "N/A",
            Ativo = true,
            NumeroAnimal = string.IsNullOrWhiteSpace(dto.NumeroAnimal) ? null : dto.NumeroAnimal.Trim(),
            DataNascimento = dto.DataNascimento,
            DataNascimentoInformada = string.IsNullOrWhiteSpace(dto.DataNascimentoInformada) ? null : dto.DataNascimentoInformada.Trim(),
            PaiAnimalId = await ResolverFiliacaoIdAsync(dto.PaiAnimalId, dto.PropriedadeId),
            NomePai = string.IsNullOrWhiteSpace(dto.NomePai) ? null : dto.NomePai.Trim(),
            RacaPai = string.IsNullOrWhiteSpace(dto.RacaPai) ? null : dto.RacaPai.Trim(),
            MaeAnimalId = await ResolverFiliacaoIdAsync(dto.MaeAnimalId, dto.PropriedadeId),
            NomeMae = string.IsNullOrWhiteSpace(dto.NomeMae) ? null : dto.NomeMae.Trim(),
            RacaMae = string.IsNullOrWhiteSpace(dto.RacaMae) ? null : dto.RacaMae.Trim(),
            Procedencia = string.IsNullOrWhiteSpace(dto.Procedencia) ? null : dto.Procedencia.Trim(),
            DataEntrada = dto.DataEntrada,
            DataEntradaInformada = string.IsNullOrWhiteSpace(dto.DataEntradaInformada) ? null : dto.DataEntradaInformada.Trim(),
            DataSaida = dto.DataSaida,
            DataSaidaInformada = string.IsNullOrWhiteSpace(dto.DataSaidaInformada) ? null : dto.DataSaidaInformada.Trim(),
            Valor = dto.Valor,
            MotivoSaida = string.IsNullOrWhiteSpace(dto.MotivoSaida) ? null : dto.MotivoSaida.Trim(),
            MarcaSinal = string.IsNullOrWhiteSpace(dto.MarcaSinal) ? null : dto.MarcaSinal.Trim(),
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim(),
            PropriedadeId = dto.PropriedadeId,
            Fotos = dto.Fotos
                .Take(3)
                .Select((foto, index) => new AnimalFoto
                {
                    FotoBase64 = foto.FotoBase64,
                    Ordem = foto.Ordem is >= 1 and <= 3 ? foto.Ordem : index + 1
                })
                .ToList()
        };

        _db.Animais.Add(animal);
        await _db.SaveChangesAsync();
        return (true, "Animal cadastrado com sucesso!", animal.Id);
    }

    public async Task<(bool Sucesso, string Mensagem)> AtualizarAsync(int id, int propriedadeId, CadastrarAnimalDto dto)
    {
        var animal = await _db.Animais
            .FirstOrDefaultAsync(a => a.Id == id && a.PropriedadeId == propriedadeId);

        if (animal is null)
            return (false, "Animal não encontrado ou não pertence à sua propriedade.");
        if (dto.Fotos.Count > 3)
            return (false, "Cada animal pode ter no máximo 3 fotos.");

        animal.Nome = string.IsNullOrWhiteSpace(dto.Nome) ? null : dto.Nome.Trim();
        animal.Raca = dto.Raca.Trim();
        animal.Raca2 = string.IsNullOrWhiteSpace(dto.Raca2) ? null : dto.Raca2.Trim();
        animal.Sexo = dto.Sexo;
        animal.Tipo = dto.Tipo.Trim();
        animal.StatusLeite = dto.Sexo == "F" ? dto.StatusLeite : "N/A";
        animal.NumeroAnimal = string.IsNullOrWhiteSpace(dto.NumeroAnimal) ? null : dto.NumeroAnimal.Trim();
        animal.DataNascimento = dto.DataNascimento;
        animal.DataNascimentoInformada = string.IsNullOrWhiteSpace(dto.DataNascimentoInformada) ? null : dto.DataNascimentoInformada.Trim();
        animal.PaiAnimalId = await ResolverFiliacaoIdAsync(dto.PaiAnimalId, propriedadeId, animal.Id);
        animal.NomePai = string.IsNullOrWhiteSpace(dto.NomePai) ? null : dto.NomePai.Trim();
        animal.RacaPai = string.IsNullOrWhiteSpace(dto.RacaPai) ? null : dto.RacaPai.Trim();
        animal.MaeAnimalId = await ResolverFiliacaoIdAsync(dto.MaeAnimalId, propriedadeId, animal.Id);
        animal.NomeMae = string.IsNullOrWhiteSpace(dto.NomeMae) ? null : dto.NomeMae.Trim();
        animal.RacaMae = string.IsNullOrWhiteSpace(dto.RacaMae) ? null : dto.RacaMae.Trim();
        animal.Procedencia = string.IsNullOrWhiteSpace(dto.Procedencia) ? null : dto.Procedencia.Trim();
        animal.DataEntrada = dto.DataEntrada;
        animal.DataEntradaInformada = string.IsNullOrWhiteSpace(dto.DataEntradaInformada) ? null : dto.DataEntradaInformada.Trim();
        animal.DataSaida = dto.DataSaida;
        animal.DataSaidaInformada = string.IsNullOrWhiteSpace(dto.DataSaidaInformada) ? null : dto.DataSaidaInformada.Trim();
        animal.Valor = dto.Valor;
        animal.MotivoSaida = string.IsNullOrWhiteSpace(dto.MotivoSaida) ? null : dto.MotivoSaida.Trim();
        animal.MarcaSinal = string.IsNullOrWhiteSpace(dto.MarcaSinal) ? null : dto.MarcaSinal.Trim();
        animal.Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim();

        var fotosAtuais = await _db.AnimalFotos
            .Where(f => f.AnimalId == animal.Id)
            .ToListAsync();
        _db.AnimalFotos.RemoveRange(fotosAtuais);
        _db.AnimalFotos.AddRange(dto.Fotos
            .Take(3)
            .Select((foto, index) => new AnimalFoto
            {
                AnimalId = animal.Id,
                FotoBase64 = foto.FotoBase64,
                Ordem = foto.Ordem is >= 1 and <= 3 ? foto.Ordem : index + 1
            }));

        await _db.SaveChangesAsync();
        return (true, "Animal atualizado com sucesso!");
    }

    public async Task<(bool Sucesso, string Mensagem)> ExcluirAsync(int id, int propriedadeId)
    {
        var animal = await _db.Animais
            .FirstOrDefaultAsync(a => a.Id == id && a.PropriedadeId == propriedadeId);

        if (animal is null)
            return (false, "Animal não encontrado ou não pertence à sua propriedade.");

        _db.Animais.Remove(animal);
        await _db.SaveChangesAsync();
        return (true, "Animal excluído com sucesso!");
    }
    private async Task<int?> ResolverFiliacaoIdAsync(int? animalId, int propriedadeId, int? animalAtualId = null)
    {
        if (animalId is null)
            return null;

        var existeNaPropriedade = await _db.Animais.AnyAsync(a =>
            a.Id == animalId.Value &&
            a.PropriedadeId == propriedadeId &&
            (animalAtualId == null || a.Id != animalAtualId.Value));

        return existeNaPropriedade ? animalId : null;
    }
}
