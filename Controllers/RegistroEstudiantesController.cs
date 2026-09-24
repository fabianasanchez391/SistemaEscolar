using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class RegistroEstudiantesController : Controller
    {

        public IActionResult Estudiantes()
        {
            return View();
        }
    }
}
