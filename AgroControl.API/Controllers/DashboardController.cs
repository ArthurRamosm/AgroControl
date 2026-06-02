using Microsoft.AspNetCore.Mvc;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(DashboardService dashboardService) : ControllerBase
{
    private readonly DashboardService _service = dashboardService;

    [HttpGet("{propriedadeId:int}")]
    public async Task<IActionResult> Obter(int propriedadeId)
    {
        var resultado = await _service.ObterAsync(propriedadeId);
        return Ok(resultado);
    }
}
