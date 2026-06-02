namespace AgroControl.API.DTOs;

public class ResumoRebanhoDto
{
    public int Machos { get; set; }
    public int Femeas { get; set; }
    public int Bezerros { get; set; }
    public int Matrizes { get; set; }
    public int Reprodutores { get; set; }
}

public class DashboardResponseDto
{
    public int TotalAnimais { get; set; }
    public int Saudaveis { get; set; }
    public int VacinasPendentes { get; set; }
    public int Produzindo { get; set; }
    public int EmEngorda { get; set; }
    public int AlertasNaoLidos { get; set; }
    public string FocoProdutivo { get; set; } = "ambos";
    public ResumoRebanhoDto ResumoRebanho { get; set; } = new();
}
