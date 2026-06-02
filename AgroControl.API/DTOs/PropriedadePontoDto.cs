using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class CadastrarPropriedadePontoDto
{
    [Range(1, int.MaxValue, ErrorMessage = "ID da propriedade invalido")]
    public int PropriedadeId { get; set; }

    [Required(ErrorMessage = "Tipo do ponto e obrigatorio")]
    [MaxLength(20, ErrorMessage = "Tipo do ponto pode ter no maximo 20 caracteres")]
    public string Tipo { get; set; } = string.Empty;

    [Required(ErrorMessage = "Nome do ponto e obrigatorio")]
    [MaxLength(100, ErrorMessage = "Nome do ponto pode ter no maximo 100 caracteres")]
    public string Nome { get; set; } = string.Empty;

    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }

    [MaxLength(500, ErrorMessage = "Observacao pode ter no maximo 500 caracteres")]
    public string? Observacao { get; set; }
}

public class PropriedadePontoResponseDto
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; }
}
