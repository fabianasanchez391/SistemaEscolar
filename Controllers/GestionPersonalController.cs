using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class GestionPersonalController : Controller 
    {
        public IActionResult Personal()
        {
            return View();
        }

    }
}
