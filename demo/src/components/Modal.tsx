import { FormEvent, useContext, useEffect, useState } from "react";
import cn from "classnames"

import { SpacesContext } from ".";
import { Member } from "../utils/types";

interface Props {
    self?: Member;
    isVisible?: boolean
    setIsVisible?: (isVisible: boolean) => void
}

export const Modal = ({ isVisible = false, setIsVisible, self }: Props) => {
    const space = useContext(SpacesContext);
    const [value, setValue] = useState(self?.profileData?.name);

    console.log(self?.profileData?.name, value)

    const handleChange = (e: FormEvent<HTMLInputElement>) => {
        setValue(e.currentTarget.value)
    }
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!space || !setIsVisible) return;

        space.updateProfileData(currentProfile => {
            console.log(currentProfile)
            return {  name: value }
        });

        setIsVisible(false)
    }

    useEffect(() => {
        setValue(self?.profileData?.name)
    }, [self?.profileData?.name])

    return <div className={cn("backdrop-blur-md bg-black/30 fixed top-0 left-0 w-full h-full flex items-center justify-center transition-all duration-300", {
        "opacity-0 pointer-events-none": !isVisible,
        "opacity-100": isVisible
    })}>
        <form onSubmit={handleSubmit} className="bg-white p-8 shadow-lg rounded-[20px]">
            <h3 className="font-semibold text-xl text-center mb-8">Enter your name</h3>
            <input value={value} onChange={handleChange} className="border border-gray-300 rounded-md p-2 w-full" />
            <button type="submit" className="bg-ably-black text-white rounded-md p-2 w-full mt-4">Set name</button>
        </form>
    </div>
}