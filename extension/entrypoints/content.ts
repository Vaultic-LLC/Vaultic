import { PasswordByDomainResponse, RuntimeMessages } from "@/lib/Types/RuntimeMessages";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

type BrowserWindow = Window & typeof globalThis;

function isIframeWindow(targetWindow: BrowserWindow | null | undefined = window): boolean
{
    if (!targetWindow)
    {
        return false;
    }

    try
    {
        return targetWindow.self !== targetWindow.top;
    }
    catch
    {
        // Accessing window.top on cross-origin frames can throw.
        return true;
    }
}

function isElementInsideIframe(element: Element | null): boolean
{
    if (!element)
    {
        return false;
    }

    const elementWindow = element.ownerDocument?.defaultView as BrowserWindow | null;
    return isIframeWindow(elementWindow ?? undefined);
}

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

function getDomain()
{
    const domainParts = window.location.hostname.split('.');
    return domainParts[domainParts.length - 2];
}
  
async function handlePageChange() 
{
    if (isIframeWindow())
    {
        console.log('Vaultic: ignoring iframe context for autofill');
        return;
    }

    const response = await browser.runtime.sendMessage({ type: RuntimeMessages.IsSignedIn });
    if (!response)
    {
        return;
    }

    const temporaryPassword: { domain: string, password: string } | undefined = await browser.runtime.sendMessage({ type: RuntimeMessages.GetTemporaryPassword });
    if (temporaryPassword)
    {
        showSaveTemporaryPasswordDialog(temporaryPassword);
        return;
    }

    const form = document.querySelector('form');
    if (!form)
    {
        console.log('No form found');
        return;
    }

    const usernameField = form.querySelector('form input[type="email"], form input[autocomplete*="email" i]') || 
        form.querySelector('form input[type="text"], form input[autocomplete*="username" i]');

    let passwordField = document.querySelector('form input[type="password"], form input[autocomplete*="current-password" i]');

    if (isElementInsideIframe(usernameField) || isElementInsideIframe(passwordField))
    {
        console.log('Vaultic: skipping fields located inside iframe');
        return;
    }

    if (!usernameField || !passwordField)
    {
        console.log('No username or password field found');
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

    const domain = getDomain();

    const passwords: PasswordByDomainResponse = await browser.runtime.sendMessage({ 
        type: RuntimeMessages.GetPasswordsByDomain, 
        domain: domain
    });

    // Check if this is a password creation page (has password confirmation field)
    const isPasswordCreation = detectPasswordCreationForm(form);

    if (isPasswordCreation && passwordField)
    {
        // Add password generation icon
        addPasswordGeneratorIcon(passwordField);
    }
    else if (usernameField && passwordField)
    {
        addAutofillIcon(usernameField, passwordField, passwords);
    }
    else if (usernameField)
    {
        addAutofillIcon(usernameField, null, passwords);
    }
    else if (passwordField)
    {    
        addAutofillIcon(passwordField, passwordField, passwords);
    }
}

// Detect if this is a password creation form (signup/register)
function detectPasswordCreationForm(form: HTMLFormElement): boolean
{
    const passwordFields = Array.from(form.querySelectorAll('input[type="password"]'));
    return passwordFields.some(field => field.getAttribute('autocomplete')?.toLowerCase().includes('new-password'));
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
    icon.src = browser.runtime.getURL('/icon/icon.png' as any);
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
        icon.style.top = `${rect.top + window.scrollY + (rect.height - 26) / 2}px`;
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
        passwords.forEach((password, i) => {
            const item = document.createElement('div');
            item.className = 'vaultic-autofill-item';
            
            Object.assign(item.style, {
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: i === passwords.length - 1 ? 'none' : '1px solid rgb(240, 110, 50)',
                display: 'flex',
                flexDirection: 'column',
            });

            const passwordForElement = document.createElement('span');
            passwordForElement.textContent = password.passwordFor!;
            Object.assign(passwordForElement.style, {
                fontSize: '12px',
            });

            const usernameElement = document.createElement('span');
            usernameElement.textContent = password.username!;
            Object.assign(usernameElement.style, {
                fontSize: '10px',
            });

            item.appendChild(passwordForElement);
            item.appendChild(usernameElement);

            // Store original values
            const originalEmailValue = inputElement.value;
            const originalPasswordValue = passwordElement?.value || '';

            // Hover effect - temporarily show email and masked password
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'rgb(31, 28, 28)';
                
                if (password.username)
                {
                    inputElement.value = password.username;
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

                // Fill in the username field
                if (password.username)
                {
                    inputElement.value = password.username;
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

// Add password generator icon to password fields on creation forms
function addPasswordGeneratorIcon(passwordField: Element)
{
    const passwordElement = passwordField as HTMLInputElement;
    window.addEventListener('beforeunload', () => 
    {
        //@ts-ignore
        if (!passwordField.value)
        {
            return;
        }

        browser.runtime.sendMessage({ 
            type: RuntimeMessages.SetTemporaryPassword,
            domain: getDomain(),
            //@ts-ignore
            password: passwordField.value
        });
    });

    if (passwordElement.parentElement?.querySelector('.vaultic-generator-icon'))
        {
            return;
        }

    // Create icon element
    const icon = document.createElement('img');
    icon.src = browser.runtime.getURL('/icon/icon.png' as any);
    icon.className = 'vaultic-generator-icon';
    icon.alt = 'Generate Password';
    
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
        const rect = passwordElement.getBoundingClientRect();
        icon.style.top = `${rect.top + window.scrollY + (rect.height - 26) / 2}px`;
        icon.style.left = `${rect.left + window.scrollX + rect.width - 30}px`;
    };

    // Make the input field's parent position relative if needed
    if (passwordElement.parentElement)
    {
        const parentStyle = window.getComputedStyle(passwordElement.parentElement);
        if (parentStyle.position === 'static')
        {
            passwordElement.parentElement.style.position = 'relative';
        }
    }

    // Create dropdown element
    let dropdown: HTMLDivElement | null = null;
    let currentGeneratedPassword: string = '';

    const createGeneratorDropdown = async () => {
        // Generate initial password
        currentGeneratedPassword = await browser.runtime.sendMessage({ 
            type: RuntimeMessages.GeneratePassword,
            length: 20,
            includeNumbers: true,
            includeSpecialCharacters: true,
            includeAmbiguousCharacters: false
        });

        dropdown = document.createElement('div');
        dropdown.className = 'vaultic-generator-dropdown';
        
        Object.assign(dropdown.style, {
            position: 'absolute',
            color: 'white',
            backgroundColor: '#0f111d',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: '10001',
            minWidth: '250px',
            padding: '12px',
        });

        // Position dropdown below the input field
        const rect = passwordElement.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 2}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;

        // Create container for password display and regenerate button
        const passwordContainer = document.createElement('div');
        Object.assign(passwordContainer.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
        });

        // Password display
        const passwordDisplay = document.createElement('div');
        passwordDisplay.className = 'vaultic-generated-password';
        passwordDisplay.textContent = currentGeneratedPassword;
        Object.assign(passwordDisplay.style, {
            flex: '1',
            padding: '8px',
            backgroundColor: '#15151b',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
            wordBreak: 'break-all',
            border: '1.5px solid rgb(100 71 57)'
        });

        // Regenerate button
        const regenerateBtn = document.createElement('button');
        regenerateBtn.textContent = '↻';
        regenerateBtn.title = 'Generate New Password';
        Object.assign(regenerateBtn.style, {
            padding: '7px 12px',
            backgroundColor: '#0f111d',
            color: 'white',
            border: '1.5px solid rgb(240, 110, 50)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '17px',
            fontWeight: 'bold',
            transition: '0.3s',
        });

        regenerateBtn.addEventListener('mouseenter', () => {
            regenerateBtn.style.boxShadow = '0 0 25px rgb(240, 110, 50)';
        });

        regenerateBtn.addEventListener('mouseleave', () => {
            regenerateBtn.style.boxShadow = 'none';
        });

        regenerateBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Generate new password
            currentGeneratedPassword = await browser.runtime.sendMessage({ 
                type: RuntimeMessages.GeneratePassword,
                length: 20,
                includeNumbers: true,
                includeSpecialCharacters: true,
                includeAmbiguousCharacters: false
            });
            
            passwordDisplay.textContent = currentGeneratedPassword;
        });

        passwordContainer.appendChild(passwordDisplay);
        passwordContainer.appendChild(regenerateBtn);

        // Use password button
        const usePasswordBtn = document.createElement('button');
        usePasswordBtn.textContent = 'Use This Password';
        Object.assign(usePasswordBtn.style, {
            width: '100%',
            padding: '10px',
            backgroundColor: '#0f111d',
            color: 'white',
            border: '1.5px solid rgb(240, 110, 50)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: '0.3s',
        });

        usePasswordBtn.addEventListener('mouseenter', () => {
            usePasswordBtn.style.boxShadow = '0 0 25px rgb(240, 110, 50)';
        });

        usePasswordBtn.addEventListener('mouseleave', () => {
            usePasswordBtn.style.boxShadow = 'none';
        });

        usePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Fill the password field
            passwordElement.value = currentGeneratedPassword;
            passwordElement.dispatchEvent(new Event('input', { bubbles: true }));
            passwordElement.dispatchEvent(new Event('change', { bubbles: true }));

            // Find and fill password confirmation field if it exists
            const form = passwordElement.closest('form');
            if (form)
            {
                const passwordFields = Array.from(form.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
                const confirmField = passwordFields.find(field => 
                    field !== passwordElement &&
                    (field.name.toLowerCase().includes('confirm') ||
                     field.id.toLowerCase().includes('confirm') ||
                     field.placeholder.toLowerCase().includes('confirm'))
                );

                if (confirmField)
                {
                    confirmField.value = currentGeneratedPassword;
                    confirmField.dispatchEvent(new Event('input', { bubbles: true }));
                    confirmField.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Close dropdown
            if (dropdown)
            {
                dropdown.remove();
                dropdown = null;
            }
        });

        dropdown.appendChild(passwordContainer);
        dropdown.appendChild(usePasswordBtn);
        document.body.appendChild(dropdown);
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
            createGeneratorDropdown();
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
        if (!document.body.contains(passwordElement))
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

function showSaveTemporaryPasswordDialog(temporaryPassword: { domain: string, password: string })
{
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'vaultic-save-password-dialog';
    
    Object.assign(dialog.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#0f111d',
        color: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '10002',
        padding: '16px',
        minWidth: '200px',
        maxWidth: '400px',
    });

    // Create message text
    const message = document.createElement('div');
    message.textContent = `Save password for ${temporaryPassword.domain}?`;
    Object.assign(message.style, {
        marginBottom: '16px',
        fontSize: '14px',
        lineHeight: '1.4',
        textAlign: 'center',
    });

    // Create button container
    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
    });

    // Create "Yes" button
    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    Object.assign(yesButton.style, {
        padding: '8px 16px',
        backgroundColor: '#0f111d',
        color: 'white',
        border: '1.5px solid rgb(240, 110, 50)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: '0.3s',
        width: '60px'
    });

    yesButton.addEventListener('mouseenter', () => {
        yesButton.style.boxShadow = '0 0 25px rgb(240, 110, 50)';
    });

    yesButton.addEventListener('mouseleave', () => {
        yesButton.style.boxShadow = 'none';
    });

    yesButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        yesButton.disabled = true;
        noButton.disabled = true;
        
        // Call saveTemporaryPassword
        const success = await browser.runtime.sendMessage({
            type: RuntimeMessages.SaveTemporaryPassword,
            domain: temporaryPassword.domain,
            password: temporaryPassword.password
        });

        if (success)
        {
            yesButton.remove();
            noButton.remove();
            message.textContent = "Save successfully!";
            setTimeout(() => 
            {
                dialog.remove();
            }, 3000);
        }
        else
        {
            yesButton.disabled = false;
            noButton.disabled = false;

            message.textContent = "Save failed!";
            yesButton.textContent = "Retry";
            noButton.textContent = "Close";
        }
    });

    // Create "No" button
    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    Object.assign(noButton.style, {
        padding: '8px 16px',
        backgroundColor: '#0f111d',
        color: 'white',
        border: '1.5px solid rgb(240, 110, 50)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: '0.3s',
        width: '60px'
    });

    noButton.addEventListener('mouseenter', () => {
        noButton.style.boxShadow = '0 0 25px rgb(240, 110, 50)';
    });

    noButton.addEventListener('mouseleave', () => {
        noButton.style.boxShadow = 'none';
    });


    noButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Call clearTemporaryPassword
        await browser.runtime.sendMessage({
            type: RuntimeMessages.ClearTemporaryPassword
        });
        
        // Remove dialog
        dialog.remove();
    });

    // Append buttons to button container
    buttonContainer.appendChild(noButton);
    buttonContainer.appendChild(yesButton);

    // Append elements to dialog
    dialog.appendChild(message);
    dialog.appendChild(buttonContainer);

    // Add dialog to page
    document.body.appendChild(dialog);
}