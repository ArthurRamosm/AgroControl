using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class CadastrarAnimalEventoDto
{
    [Required(ErrorMessage = "Tipo do evento e obrigatorio")]
    [MaxLength(50, ErrorMessage = "Tipo do evento pode ter no maximo 50 caracteres")]
    public string TipoEvento { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data do evento e obrigatoria")]
    public DateTime DataEvento { get; set; }

    public decimal? PesoKg { get; set; }
    public decimal? RacaoKgDia { get; set; }
    public decimal? LeiteLitrosDia { get; set; }

    [MaxLength(500, ErrorMessage = "Observacao pode ter no maximo 500 caracteres")]
    public string? Observacao { get; set; }
}

public class AnimalEventoResponseDto
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string TipoEvento { get; set; } = string.Empty;
    public DateTime DataEvento { get; set; }
    public decimal? PesoKg { get; set; }
    public decimal? RacaoKgDia { get; set; }
    public decimal? LeiteLitrosDia { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; }
}
