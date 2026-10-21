using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class GestionJustificaciones : Controller
    {

        public IActionResult Justificaciones()
        {
            return View();
        }
    }
}
