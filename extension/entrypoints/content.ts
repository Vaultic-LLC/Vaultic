import { PasswordByDomainResponse, RuntimeMessages } from "@/lib/Types/RuntimeMessages";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

export default defineContentScript({
    matches: [
      '*://*/*',
    ],
    runAt: 'document_end', 
    main() 
    {
        handlePageChange();
    },
});
  
async function handlePageChange() 
{
    console.log('Page changed! New content loaded.');

    const form = document.querySelector('form');
    if (!form)
    {
        console.log('No form found');
        return;
    }

    const emailField = form.querySelector('form input[type="email"], form input[name*="email" i]');
    let passwordField = document.querySelector('form input[type="password"], form input[name*="passwrd"]');

    if (!emailField || !passwordField)
    {
        console.log('No email or password field found');
        return;
    }

    if (passwordField)
    {
        const style = window.getComputedStyle(passwordField);
        if (style.display === 'none' || 
            style.visibility === 'hidden' || 
            style.opacity === '0') {
            passwordField = null;
        }
    }

    const domainParts = window.location.hostname.split('.');
    const domain = domainParts[domainParts.length - 2];

    const passwords: PasswordByDomainResponse = await browser.runtime.sendMessage({ 
        type: RuntimeMessages.GetPasswordsByDomain, 
        domain: domain
    });

    if (emailField && passwordField)
    {
        addAutofillIcon(emailField, passwordField, passwords);
    }
    // TODO: if there is just a single email field then that's all we need to autofill right now until the user goes to the
    // next page but we need to save which email was used in the background.ts so that we can then autofill that one on the next page
    else if (emailField)
    {
       
        addAutofillIcon(emailField, null, passwords);
    }
    else if (passwordField)
    {    
        addAutofillIcon(passwordField, passwordField, passwords);
    }
}

// Should add an icon to the field that when clicked shows all the possible passwords and auto fills them when one is clicked
function addAutofillIcon(field: Element, passwordField: Element | null, passwords: PasswordByDomainResponse)
{
    const inputElement = field as HTMLInputElement;
    const passwordElement = passwordField as HTMLInputElement | null;
    
    // Check if icon already exists for this field
    if (inputElement.parentElement?.querySelector('.vaultic-autofill-icon'))
    {
        return;
    }

    // If no passwords available, don't add icon
    if (!passwords || passwords.length === 0)
    {
        return;
    }

    // Create icon element
    const icon = document.createElement('img');
    icon.src = browser.runtime.getURL('icon/icon.png');
    icon.className = 'vaultic-autofill-icon';
    icon.alt = 'Autofill';
    
    // Style the icon
    Object.assign(icon.style, {
        position: 'absolute',
        width: '20px',
        height: '26px',
        cursor: 'pointer',
        zIndex: '10000',
        pointerEvents: 'auto',
    });

    // Position the icon relative to the input field
    const positionIcon = () => {
        const rect = inputElement.getBoundingClientRect();
        icon.style.top = `${rect.top + window.scrollY + (rect.height - 20) / 2}px`;
        icon.style.left = `${rect.left + window.scrollX + rect.width - 30}px`;
    };

    // Make the input field's parent position relative if needed
    if (inputElement.parentElement)
    {
        const parentStyle = window.getComputedStyle(inputElement.parentElement);
        if (parentStyle.position === 'static')
        {
            inputElement.parentElement.style.position = 'relative';
        }
    }

    // Create dropdown element
    let dropdown: HTMLDivElement | null = null;

    const createDropdown = () => {
        dropdown = document.createElement('div');
        dropdown.className = 'vaultic-autofill-dropdown';
        
        Object.assign(dropdown.style, {
            position: 'absolute',
            color: 'white',
            backgroundColor: 'rgb(17, 15, 15)',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: '10001',
            minWidth: '200px',
        });

        // Position dropdown below the input field
        const rect = inputElement.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 2}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.width = `${rect.width}px`;

        // Add password items to dropdown
        passwords.forEach((password) => {
            const item = document.createElement('div');
            item.className = 'vaultic-autofill-item';
            item.textContent = password.email || password.id || 'Unknown';
            
            Object.assign(item.style, {
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
            });

            // Store original values
            const originalEmailValue = inputElement.value;
            const originalPasswordValue = passwordElement?.value || '';

            // Hover effect - temporarily show email and masked password
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'rgb(31, 28, 28)';
                
                if (password.email)
                {
                    inputElement.value = password.email;
                }
                
                if (passwordElement)
                {
                    passwordElement.value = '**********';
                }
            });

            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'rgb(17, 15, 15)';
                
                // Restore original values
                inputElement.value = originalEmailValue;
                if (passwordElement)
                {
                    passwordElement.value = originalPasswordValue;
                }
            });

            // Click event - actually fill the fields with real data
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Request the actual password data from background
                const passwordData: TypedMethodResponse<string | undefined> = await browser.runtime.sendMessage({
                    type: RuntimeMessages.GetPasswordData,
                    id: password.id
                });

                if (!passwordData.success)
                {
                    console.error('Failed to get password');
                    return;
                }

                // Fill in the email field
                if (password.email)
                {
                    inputElement.value = password.email;
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Fill in the password field with actual password
                if (passwordElement)
                {
                    passwordElement.value = passwordData.value!;
                    passwordElement.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordElement.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Close dropdown
                if (dropdown)
                {
                    dropdown.remove();
                    dropdown = null;
                }
            });

            dropdown!.appendChild(item);
        });

        document.body.appendChild(dropdown!);
    };

    // Add click event listener to icon
    icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (dropdown)
        {
            // Close dropdown if already open
            dropdown.remove();
            dropdown = null;
        }
        else
        {
            // Open dropdown
            createDropdown();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.contains(e.target as Node) && e.target !== icon)
        {
            dropdown.remove();
            dropdown = null;
        }
    });

    // Position and add icon to page
    positionIcon();
    document.body.appendChild(icon);

    // Reposition on scroll and resize
    window.addEventListener('scroll', positionIcon);
    window.addEventListener('resize', positionIcon);

    // Remove icon when input field is removed
    const observer = new MutationObserver(() => {
        if (!document.body.contains(inputElement))
        {
            icon.remove();
            if (dropdown)
            {
                dropdown.remove();
            }
            observer.disconnect();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}