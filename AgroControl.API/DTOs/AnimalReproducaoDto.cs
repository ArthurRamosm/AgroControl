using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class CadastrarAnimalReproducaoDto
{
    [Required(ErrorMessage = "Tipo do evento e obrigatorio")]
    [MaxLength(50, ErrorMessage = "Tipo do evento pode ter no maximo 50 caracteres")]
    public string TipoEvento { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data do evento e obrigatoria")]
    public DateTime DataEvento { get; set; }

    [MaxLength(100, ErrorMessage = "Reprodutor pode ter no maximo 100 caracteres")]
    public string? Reprodutor { get; set; }

    [MaxLength(100, ErrorMessage = "Inseminador pode ter no maximo 100 caracteres")]
    public string? Inseminador { get; set; }

    public DateTime? PrevisaoParto { get; set; }

    [MaxLength(100, ErrorMessage = "Resultado pode ter no maximo 100 caracteres")]
    public string? Resultado { get; set; }

    [MaxLength(500, ErrorMessage = "Observacao pode ter no maximo 500 caracteres")]
    public string? Observacao { get; set; }
}

public class AnimalReproducaoResponseDto
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string TipoEvento { get; set; } = string.Empty;
    public DateTime DataEvento { get; set; }
    public string? Reprodutor { get; set; }
    public string? Inseminador { get; set; }
    public DateTime? PrevisaoParto { get; set; }
    public string? Resultado { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; }
}
