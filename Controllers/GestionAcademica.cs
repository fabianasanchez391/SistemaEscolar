using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class GestionAcademica : Controller
    {
        public IActionResult Calificaciones()
        {
            return View();
        }
    }
}
