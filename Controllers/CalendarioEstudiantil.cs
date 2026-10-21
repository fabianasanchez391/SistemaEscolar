using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class CalendarioEstudiantil : Controller
    {

        public IActionResult Calendario()
        {
            return View();
        }
    }
}
